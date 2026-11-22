import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";

export const PROFILE_PROXY_PATH = "/api/fixmate/profile";
export const PROFILE_UPSTREAM_PATH = "/api/profile";
export const PROXY_METHODS = Object.freeze(["GET", "PATCH"]);
const REQUEST_TIMEOUT_MS = 7000;
const MAX_BODY_LENGTH = 16384;

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

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function createProfileProxyHandler({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function handleProfileProxy({
    method,
    authorization,
    body,
  } = {}) {
    if (!PROXY_METHODS.includes(method)) {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    if (typeof body === "string" && body.length > MAX_BODY_LENGTH) {
      return errorResponse(413, "PAYLOAD_TOO_LARGE", "Profile payload is too large.");
    }

    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await upstreamFetch(new URL(PROFILE_UPSTREAM_PATH, origin), {
        method,
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
          ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
        },
        body: method === "PATCH" ? body || "{}" : undefined,
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
