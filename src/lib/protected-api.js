import { createAuthenticatedFetch } from "./authenticated-api.js";
import { getAccessToken } from "./auth-token.js";

export const CURRENT_USER_PATH = "/api/fixmate/me";

const authenticatedFetch = createAuthenticatedFetch({ getAccessToken });

function messageFrom(payload, fallback) {
  if (typeof payload?.error?.message === "string" && payload.error.message) {
    return payload.error.message;
  }
  return fallback;
}

export async function getCurrentApplicationUser() {
  const response = await authenticatedFetch(CURRENT_USER_PATH);
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success !== true || !payload.data) {
    throw new Error(messageFrom(payload, "Unable to load the current user."));
  }

  return payload.data;
}
