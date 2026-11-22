import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { resolveServerApiOrigin } from "./profile-proxy.js";
import {
  APPROVAL_STATUSES,
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
const MODERATION_QUERY_KEYS = new Set(["status", "page", "limit"]);
const EMPTY_QUERY_KEYS = new Set();
const ALLOWED_FIELDS = new Set(SERVICE_WRITE_FIELDS);
const MAX_QUERY_PAGE = 100000;
const MAX_QUERY_LIMIT = 50;

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

function isModerationList(method, parts) {
  return method === "GET" && parts.length === 1 && parts[0] === "moderation";
}

function isModerationDetail(method, parts) {
  return (
    method === "GET" &&
    parts.length === 2 &&
    parts[0] === "moderation" &&
    isValidServiceId(parts[1])
  );
}

function isModerationApproval(method, parts) {
  return (
    method === "PATCH" &&
    parts.length === 3 &&
    parts[0] === "moderation" &&
    isValidServiceId(parts[1]) &&
    parts[2] === "approval"
  );
}

export function resolveServiceUpstreamPath(method, segments = []) {
  const parts = Array.isArray(segments) ? segments : [];

  if (method === "GET") {
    if (parts.length === 0 || (parts.length === 1 && parts[0] === "mine")) {
      return "/mine";
    }
    if (isModerationList(method, parts)) return "/moderation";
    if (isModerationDetail(method, parts)) return `/moderation/${parts[1]}`;
    return null;
  }

  if (method === "POST") return parts.length === 0 ? "" : null;

  if (method === "PATCH") {
    if (isModerationApproval(method, parts)) {
      return `/moderation/${parts[1]}/approval`;
    }
    return parts.length === 1 && isValidServiceId(parts[0]) ? `/${parts[0]}` : null;
  }

  if (method === "DELETE") {
    return parts.length === 1 && isValidServiceId(parts[0]) ? `/${parts[0]}` : null;
  }

  return null;
}

function parseBoundedInteger(value, maximum) {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return value;
}

function resolveQuery(searchParams, allowedKeys = ALLOWED_QUERY_KEYS) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams ?? {});

  const seen = new Set();
  for (const key of params.keys()) {
    if (!allowedKeys.has(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const status = allowedKeys.has("status") ? params.get("status") : null;
  if (
    status !== null &&
    (typeof status !== "string" || !APPROVAL_STATUSES.includes(status))
  ) {
    return null;
  }

  const page = parseBoundedInteger(params.get("page"), MAX_QUERY_PAGE);
  const limit = parseBoundedInteger(params.get("limit"), MAX_QUERY_LIMIT);
  if (
    (params.get("page") !== null && page === null) ||
    (params.get("limit") !== null && limit === null)
  ) {
    return null;
  }

  const query = new URLSearchParams();
  if (status !== null) query.set("status", status);
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

function sanitizeApprovalBody(body) {
  if (typeof body !== "string" || body.length === 0) return null;
  if (body.length > MAX_BODY_LENGTH) return { error: "too-large" };

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== "status") return null;
  if (typeof parsed.status !== "string" || !APPROVAL_STATUSES.includes(parsed.status)) {
    return null;
  }

  // The Server accepts exactly { status }; no reason or identity field is wired.
  return { body: JSON.stringify({ status: parsed.status }) };
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

    const parts = Array.isArray(segments) ? segments : [];

    let query = "";
    if (method === "GET") {
      const allowedKeys = isModerationList(method, parts)
        ? MODERATION_QUERY_KEYS
        : isModerationDetail(method, parts)
          ? EMPTY_QUERY_KEYS
          : ALLOWED_QUERY_KEYS;
      const resolvedQuery = resolveQuery(searchParams, allowedKeys);
      if (resolvedQuery === null) {
        return errorResponse(400, "INVALID_QUERY", "Service query is not supported.");
      }
      query = resolvedQuery;
    }

    let forwardedBody;
    if (method === "POST" || method === "PATCH") {
      const approval = isModerationApproval(method, parts);
      const resolvedBody = approval ? sanitizeApprovalBody(body) : sanitizeBody(body);
      if (resolvedBody?.error === "too-large") {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", "Service payload is too large.");
      }
      if (!resolvedBody?.body) {
        return errorResponse(
          400,
          "VALIDATION_FAILED",
          approval ? "Approval data is invalid." : "Service data is invalid.",
        );
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
