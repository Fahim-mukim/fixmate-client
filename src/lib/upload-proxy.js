import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { resolveServerApiOrigin } from "./profile-proxy.js";

export const UPLOAD_PROXY_PATH = "/api/fixmate/uploads";
export const UPLOAD_UPSTREAM_PATH = "/api/uploads";
export const UPLOAD_PROXY_METHODS = Object.freeze(["POST"]);
const REQUEST_TIMEOUT_MS = 30000;
// Mirrors the Server's dedicated /api/uploads JSON body limit.
const MAX_BODY_LENGTH = 8 * 1024 * 1024;

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

export function createUploadProxyHandler({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function handleUploadProxy({
    method,
    authorization,
    body,
  } = {}) {
    if (!UPLOAD_PROXY_METHODS.includes(method)) {
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

    if (typeof body !== "string" || body.length === 0) {
      return errorResponse(400, "VALIDATION_FAILED", "Upload data is required.");
    }
    if (body.length > MAX_BODY_LENGTH) {
      return errorResponse(413, "PAYLOAD_TOO_LARGE", "Image is too large.");
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
      const response = await upstreamFetch(new URL(UPLOAD_UPSTREAM_PATH, origin), {
        method: "POST",
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
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
