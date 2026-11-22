// Internal return-path validation for post-authentication redirects.
// The browser never supplies an origin, protocol, or role to these helpers.

export const MAX_RETURN_URL_LENGTH = 2048;
export const NEXT_QUERY_PARAM = "next";

const BLOCKED_INTERNAL_PREFIX = /^\/(api|sign-in|sign-up)(\/|$)/i;

/**
 * Resolve a browser-supplied `next` value to a safe internal path.
 * Anything external, malformed, oversized, or pointing at auth/API routes is
 * replaced by the caller's fallback (normally the user's role dashboard).
 */
export function safeReturnPath(value, fallback = "/") {
  const safeFallback = typeof fallback === "string" && fallback.startsWith("/") ? fallback : "/";
  if (typeof value !== "string") return safeFallback;

  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_RETURN_URL_LENGTH) return safeFallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return safeFallback;
  // Browsers may normalize backslashes into slashes, so reject them everywhere.
  if (/[\u0000-\u001F\u007F\\]/.test(candidate)) return safeFallback;

  let parsed;
  try {
    parsed = new URL(candidate, "http://fixmate.internal");
  } catch {
    return safeFallback;
  }

  if (parsed.origin !== "http://fixmate.internal") return safeFallback;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return safeFallback;
  }

  if (!decodedPath.startsWith("/") || decodedPath.startsWith("//")) return safeFallback;
  if (decodedPath.includes("\\")) return safeFallback;
  if (BLOCKED_INTERNAL_PREFIX.test(decodedPath)) return safeFallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/** Read the raw `next` parameter from a browser search string. */
export function nextParamFromSearch(search) {
  if (typeof search !== "string" || !search) return null;
  try {
    return new URLSearchParams(search).get(NEXT_QUERY_PARAM);
  } catch {
    return null;
  }
}

/** Build a sign-in URL that carries the caller back to the requested page. */
export function signInUrlForNext(pathname, search = "") {
  const raw = typeof search === "string" && search
    ? `${pathname}${search}`
    : pathname;
  const next = safeReturnPath(raw, typeof pathname === "string" ? pathname : "/");
  return `/sign-in?${NEXT_QUERY_PARAM}=${encodeURIComponent(next)}`;
}
