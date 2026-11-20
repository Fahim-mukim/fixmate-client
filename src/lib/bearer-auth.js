export const AUTHORIZATION_HEADER = "authorization";

export function bearerAuthorization(token) {
  if (typeof token !== "string" || token.trim() === "") {
    throw new Error("A bearer token is required.");
  }
  return `Bearer ${token.trim()}`;
}

export function extractBearerToken(header) {
  if (typeof header !== "string") return null;

  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export function authenticatedHeaders(token, headers = {}) {
  const result = new Headers(headers);
  result.set(AUTHORIZATION_HEADER, bearerAuthorization(token));
  result.set("Accept", "application/json");
  return result;
}
