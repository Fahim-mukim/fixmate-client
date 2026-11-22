import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { BOOKING_STATUSES, isValidBookingId } from "./booking-contract.js";

export const BOOKINGS_PROXY_PATH = "/api/fixmate/bookings";
export const BOOKING_UPSTREAM_PATH = "/api/bookings";
export const PROXY_QUERY_KEYS = Object.freeze(["status", "page", "limit"]);
const REQUEST_TIMEOUT_MS = 7000;
const MAX_RESPONSE_LENGTH = 1024 * 1024;
const MAX_QUERY_PAGE = 100000;
const MAX_QUERY_LIMIT = 50;

export function createBookingProxyRequest({
  basePath = BOOKINGS_PROXY_PATH,
  segments = [],
  query = {},
} = {}) {
  if (!Array.isArray(segments) || segments.some((part) => typeof part !== "string")) {
    throw new Error("Booking proxy path segments must be strings.");
  }

  const encoded = segments.map((part) => encodeURIComponent(part));
  const path = encoded.length ? `${basePath}/${encoded.join("/")}` : basePath;
  const search = new URLSearchParams();

  for (const key of PROXY_QUERY_KEYS) {
    const value = query?.[key];
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const serialized = search.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function parseBoundedInteger(value, maximum) {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return value;
}

export function resolveBookingQuery(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams ?? {});

  const seen = new Set();
  for (const key of params.keys()) {
    if (!PROXY_QUERY_KEYS.includes(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const status = params.get("status");
  if (status !== null && status !== "" && !BOOKING_STATUSES.includes(status)) {
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
  if (status) query.set("status", status);
  if (page !== null) query.set("page", page);
  if (limit !== null) query.set("limit", limit);
  return query;
}

function resolveMutationQuery(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams ?? {});
  const query = new URLSearchParams();
  for (const key of PROXY_QUERY_KEYS) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return query;
}

export function resolveServerApiOrigin(env) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const configured = environment.FIXMATE_SERVER_API_URL;

  if (typeof configured !== "string" || configured.trim() === "") return null;

  let parsed;
  try {
    parsed = new URL(configured.trim());
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null;

  return parsed.origin;
}

export function resolveUpstreamPath(method, segments = []) {
  const parts = Array.isArray(segments) ? segments.filter(Boolean) : [];
  const id = parts[0];

  if (method === "POST" && parts.length === 0) return "";

  if (method === "GET") {
    if (parts.length === 1 && ["mine", "technician", "admin"].includes(parts[0])) {
      return `/${parts[0]}`;
    }
    if (parts.length === 1 && isValidBookingId(parts[0])) return `/${parts[0]}`;
    if (parts.length === 2 && parts[0] === "mine" && parts[1] === "stats") {
      return "/mine/stats";
    }
    if (parts.length === 2 && parts[0] === "technician" && parts[1] === "stats") {
      return "/technician/stats";
    }
    if (parts.length === 2 && parts[0] === "technician" && isValidBookingId(parts[1])) {
      return `/technician/${parts[1]}`;
    }
  }

  if (
    method === "PATCH" &&
    parts.length === 2 &&
    isValidBookingId(parts[0]) &&
    ["cancel", "status"].includes(parts[1])
  ) {
    return `/${parts[0]}/${parts[1]}`;
  }

  return null;
}

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function createBookingProxyHandler({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function handleBookingProxy({
    method,
    segments = [],
    authorization,
    searchParams,
    body,
  } = {}) {
    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const suffix = resolveUpstreamPath(method, segments);
    if (suffix === null) {
      return errorResponse(404, "BOOKING_ROUTE_NOT_FOUND", "Booking route not found.");
    }

    const query = method === "GET"
      ? resolveBookingQuery(searchParams)
      : resolveMutationQuery(searchParams);
    if (query === null) {
      return errorResponse(400, "INVALID_QUERY", "Booking query is not supported.");
    }

    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const target = new URL(`${BOOKING_UPSTREAM_PATH}${suffix}`, origin);
    target.search = query.toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await upstreamFetch(target, {
        method,
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
          ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        },
        body: method === "GET" ? undefined : body || "{}",
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
