import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { resolveServerApiOrigin } from "./profile-proxy.js";
import {
  ADMIN_USER_UPSTREAM_PATH,
  USER_ROLES,
  isValidAdminUserId,
} from "./admin-user-contract.js";

export const ADMIN_USER_PROXY_PATH = "/api/fixmate/admin-users";
export const ADMIN_USER_PROXY_METHODS = Object.freeze(["GET"]);

const REQUEST_TIMEOUT_MS = 7000;
const MAX_RESPONSE_LENGTH = 1024 * 1024;
const MAX_SEARCH_LENGTH = 100;
const MAX_QUERY_PAGE = 100000;
const MAX_QUERY_LIMIT = 50;
const ALLOWED_QUERY_KEYS = new Set(["role", "search", "page", "limit"]);

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function resolveAdminUserUpstreamPath(method, segments = []) {
  if (method !== "GET") return null;

  const parts = Array.isArray(segments) ? segments : [];
  if (parts.length === 0) return "";
  if (parts.length === 1 && isValidAdminUserId(parts[0])) return `/${parts[0]}`;
  return null;
}

function parseBoundedInteger(value, maximum) {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return value;
}

function resolveQuery(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams ?? {});

  const seen = new Set();
  for (const key of params.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const role = params.get("role");
  if (role !== null && (typeof role !== "string" || !USER_ROLES.includes(role))) {
    return null;
  }

  const search = params.get("search");
  if (
    search !== null &&
    (typeof search !== "string" ||
      search.trim().length > MAX_SEARCH_LENGTH ||
      search.includes("\u0000"))
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
  if (role !== null) query.set("role", role);
  if (search !== null && search.trim() !== "") query.set("search", search.trim());
  if (page !== null) query.set("page", page);
  if (limit !== null) query.set("limit", limit);
  return query.toString();
}

export function createAdminUserProxyHandler({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function handleAdminUserProxy({
    method,
    segments,
    authorization,
    searchParams,
  } = {}) {
    if (!ADMIN_USER_PROXY_METHODS.includes(method)) {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const upstreamPath = resolveAdminUserUpstreamPath(method, segments);
    if (upstreamPath === null) {
      return errorResponse(404, "ADMIN_USER_ROUTE_NOT_FOUND", "Admin user route not found.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const query = resolveQuery(searchParams);
    if (query === null) {
      return errorResponse(400, "INVALID_QUERY", "Admin user query is not supported.");
    }

    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const url = new URL(`${ADMIN_USER_UPSTREAM_PATH}${upstreamPath}`, origin);
    if (query) url.search = query;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await upstreamFetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      const responseBody = await response.text();
      if (responseBody.length > MAX_RESPONSE_LENGTH) {
        return errorResponse(
          502,
          "RESPONSE_TOO_LARGE",
          "The server response is too large.",
        );
      }

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
