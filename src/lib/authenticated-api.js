import { authenticatedHeaders } from "./bearer-auth.js";

export function buildAuthenticatedRequestInit({ token, init = {} }) {
  return {
    ...init,
    headers: authenticatedHeaders(token, init.headers),
    // Better Auth cookies are session credentials, not Express JWTs. Never let
    // the browser attach them to an authenticated API request.
    credentials: "omit",
    cache: init.cache ?? "no-store",
  };
}

export function createAuthenticatedFetch({
  getAccessToken,
  fetchImpl = fetch,
} = {}) {
  if (typeof getAccessToken !== "function") {
    throw new Error("getAccessToken is required.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetchImpl is required.");
  }

  return async function authenticatedFetch(path, init = {}) {
    if (typeof path !== "string" || path.trim() === "") {
      throw new Error("An authenticated request path is required.");
    }

    const token = await getAccessToken();
    const requestInit = buildAuthenticatedRequestInit({ token, init });
    return fetchImpl(path, requestInit);
  };
}
