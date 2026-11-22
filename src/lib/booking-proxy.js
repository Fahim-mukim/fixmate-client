import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { isValidBookingId } from "./booking-contract.js";

export const BOOKINGS_PROXY_PATH = "/api/fixmate/bookings";
export const BOOKING_UPSTREAM_PATH = "/api/bookings";
export const PROXY_QUERY_KEYS = Object.freeze(["status", "page", "limit"]);
const REQUEST_TIMEOUT_MS = 7000;

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

    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const target = new URL(`${BOOKING_UPSTREAM_PATH}${suffix}`, origin);
    for (const key of PROXY_QUERY_KEYS) {
      const value = searchParams?.get?.(key);
      if (value !== null && value !== undefined && value !== "") {
        target.searchParams.set(key, value);
      }
    }

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
