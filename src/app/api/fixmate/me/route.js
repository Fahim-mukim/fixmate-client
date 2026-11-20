import { connection } from "next/server";

import { AUTHORIZATION_HEADER, extractBearerToken } from "@/lib/bearer-auth.js";
import { resolveProxyApiOrigin } from "@/lib/test-mode.js";

const UPSTREAM_PATH = "/api/auth/me";
const REQUEST_TIMEOUT_MS = 7000;

function errorResponse(status, code, message) {
  return Response.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}

export async function GET(request) {
  await connection();

  const token = extractBearerToken(request.headers.get(AUTHORIZATION_HEADER));
  if (!token) {
    return errorResponse(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required.",
    );
  }

  let apiOrigin;
  try {
    apiOrigin = resolveProxyApiOrigin();
  } catch {
    apiOrigin = null;
  }
  if (!apiOrigin) {
    return errorResponse(
      503,
      "API_CONFIGURATION",
      "The server API is not configured.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL(UPSTREAM_PATH, apiOrigin), {
      method: "GET",
      headers: {
        Accept: "application/json",
        [AUTHORIZATION_HEADER]: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.text();

    return new Response(body || null, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return errorResponse(
      502,
      "API_UNAVAILABLE",
      "The server API is temporarily unavailable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
