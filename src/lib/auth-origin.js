export function canonicalAuthOrigin(env = process.env) {
  const rawValue = env.BETTER_AUTH_URL;

  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new Error("BETTER_AUTH_URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(rawValue.trim().replace(/\/+$/, ""));
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("BETTER_AUTH_URL must use http or https.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("BETTER_AUTH_URL must not contain credentials.");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("BETTER_AUTH_URL must be an origin without path, query, or fragment.");
  }

  return parsed.origin;
}

function vercelTrustedOrigin(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveTrustedOrigins(env = process.env) {
  const authOrigin = canonicalAuthOrigin(env);
  return Array.from(
    new Set(
      [
        authOrigin,
        vercelTrustedOrigin(env.VERCEL_URL),
        vercelTrustedOrigin(env.VERCEL_PROJECT_PRODUCTION_URL),
      ].filter(Boolean),
    ),
  );
}
