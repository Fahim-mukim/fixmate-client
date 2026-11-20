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
