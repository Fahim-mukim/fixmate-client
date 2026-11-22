import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { resolveServerApiOrigin } from "./profile-proxy.js";
import {
  SERVICE_UPSTREAM_PATH,
  SERVICE_WRITE_FIELDS,
  isValidServiceId,
} from "./service-management-contract.js";

export const SERVICE_MANAGEMENT_PROXY_PATH = "/api/fixmate/services";
export const SERVICE_PROXY_METHODS = Object.freeze([
  "GET",
  "POST",
  "PATCH",
  "DELETE",
]);

const REQUEST_TIMEOUT_MS = 7000;
const MAX_BODY_LENGTH = 16384;
const ALLOWED_QUERY_KEYS = new Set(["page", "limit"]);
const ALLOWED_FIELDS = new Set(SERVICE_WRITE_FIELDS);

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function resolveServiceUpstreamPath(method, segments = []) {
  const parts = Array.isArray(segments) ? segments : [];

  if (method === "GET") {
    if (parts.length === 0 || (parts.length === 1 && parts[0] === "mine")) {
      return "/mine";
    }
    return null;
  }

  if (method === "POST") return parts.length === 0 ? "" : null;

  if (method === "PATCH" || method === "DELETE") {
    return parts.length === 1 && isValidServiceId(parts[0]) ? `/${parts[0]}` : null;
  }

  return null;
}

function resolveQuery(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams ?? {});

  for (const key of params.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return null;
  }

  const page = params.get("page");
  const limit = params.get("limit");
  if (
    (page !== null && !/^\d+$/.test(page)) ||
    (limit !== null && !/^\d+$/.test(limit))
  ) {
    return null;
  }

  const query = new URLSearchParams();
  if (page !== null) query.set("page", page);
  if (limit !== null) query.set("limit", limit);
  return query.toString();
}

function sanitizeBody(body) {
  if (typeof body !== "string" || body.length === 0) return null;
  if (body.length > MAX_BODY_LENGTH) return { error: "too-large" };

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { error: "invalid" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "invalid" };
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!ALLOWED_FIELDS.has(key) || key.includes(".") || key.includes("$")) {
      return { error: "invalid" };
    }
    sanitized[key] = value;
  }

  return { body: JSON.stringify(sanitized) };
}

export function createServiceManagementProxyHandler({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function handleServiceManagementProxy({
    method,
    segments,
    authorization,
    searchParams,
    body,
  } = {}) {
    if (!SERVICE_PROXY_METHODS.includes(method)) {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const upstreamPath = resolveServiceUpstreamPath(method, segments);
    if (upstreamPath === null) {
      return errorResponse(404, "SERVICE_ROUTE_NOT_FOUND", "Service route not found.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    let query = "";
    if (method === "GET") {
      const resolvedQuery = resolveQuery(searchParams);
      if (resolvedQuery === null) {
        return errorResponse(400, "INVALID_QUERY", "Service query is not supported.");
      }
      query = resolvedQuery;
    }

    let forwardedBody;
    if (method === "POST" || method === "PATCH") {
      const resolvedBody = sanitizeBody(body);
      if (resolvedBody?.error === "too-large") {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", "Service payload is too large.");
      }
      if (!resolvedBody?.body) {
        return errorResponse(400, "VALIDATION_FAILED", "Service data is invalid.");
      }
      forwardedBody = resolvedBody.body;
    }

    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const url = new URL(`${SERVICE_UPSTREAM_PATH}${upstreamPath}`, origin);
    if (query) url.search = query;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await upstreamFetch(url, {
        method,
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
          ...(forwardedBody === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },
        body: forwardedBody,
        cache: "no-store",
        signal: controller.signal,
      });

      const responseBody = await response.text();
      return new Response(responseBody || null, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("content-type") || "application/json",
        },
      });
    } catch {
      return errorResponse(
        503,
        "API_UNAVAILABLE",
        "The server API is temporarily unavailable.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
