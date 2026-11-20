import { canonicalAuthOrigin } from "./auth-origin.js";

export const TEST_DATABASE_NAME = "fixmate_auth_test";

const DEFAULT_DATABASE_NAME = "fixmate";
const MONGODB_URI_PREFIXES = ["mongodb://", "mongodb+srv://"];

function requiredValue(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function requiredTrimmedValue(env, name) {
  const value = requiredValue(env, name).trim();
  if (value === "") {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function isTestMode(env = process.env) {
  const rawValue = env.FIXMATE_TEST_MODE;
  if (rawValue === undefined || rawValue === null || rawValue === "" || rawValue === "false") {
    return false;
  }
  if (rawValue !== "true") {
    throw new Error("FIXMATE_TEST_MODE must be true, false, or unset.");
  }
  return true;
}

function assertTestModeAllowed(env) {
  const testMode = isTestMode(env);
  const nodeEnv = String(env.NODE_ENV || "").trim();
  if (testMode && nodeEnv === "production") {
    throw new Error("FIXMATE_TEST_MODE cannot be enabled when NODE_ENV=production.");
  }
  return testMode;
}

// MongoDB URIs are parsed manually. The WHATWG URL parser has produced
// credential-bearing diagnostics for these strings in this workspace, so no URI
// fragment is ever included in a validation error.
function extractMongoDatabaseName(uri, variableName) {
  const prefix = MONGODB_URI_PREFIXES.find((candidate) => uri.startsWith(candidate));
  if (!prefix) {
    throw new Error(`${variableName} must be a MongoDB connection string.`);
  }

  const remainder = uri.slice(prefix.length);
  const slashIndex = remainder.indexOf("/");
  const queryIndex = remainder.indexOf("?");
  const hashIndex = remainder.indexOf("#");
  const firstBoundary = [queryIndex, hashIndex]
    .filter((index) => index !== -1)
    .reduce((minimum, index) => Math.min(minimum, index), remainder.length);

  if (slashIndex === -1 || slashIndex > firstBoundary) {
    throw new Error(`${variableName} must include an explicit database path.`);
  }
  if (slashIndex === 0) {
    throw new Error(`${variableName} must include a MongoDB host.`);
  }

  let pathEnd = remainder.length;
  for (const marker of ["?", "#"]) {
    const markerIndex = remainder.indexOf(marker, slashIndex + 1);
    if (markerIndex !== -1 && markerIndex < pathEnd) {
      pathEnd = markerIndex;
    }
  }

  const databasePath = remainder.slice(slashIndex + 1, pathEnd);
  if (databasePath === "" || databasePath.includes("/")) {
    throw new Error(`${variableName} must contain exactly one database path segment.`);
  }

  return databasePath;
}

function resolveTestMongoUri(env) {
  const uri = requiredTrimmedValue(env, "FIXMATE_TEST_MONGODB_URI");
  const databaseName = extractMongoDatabaseName(uri, "FIXMATE_TEST_MONGODB_URI");
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(`FIXMATE_TEST_MONGODB_URI must target ${TEST_DATABASE_NAME}.`);
  }
  return uri;
}

function resolveTestDatabaseName(env) {
  const databaseName = requiredValue(env, "FIXMATE_TEST_DATABASE_NAME");
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(`FIXMATE_TEST_DATABASE_NAME must be ${TEST_DATABASE_NAME}.`);
  }
  return databaseName;
}

function parseOrigin(value, variableName) {
  let parsed;
  try {
    parsed = new URL(value.replace(/\/+$/, ""));
  } catch {
    throw new Error(`${variableName} must be a valid origin.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${variableName} must use http or https.`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${variableName} must not contain credentials.`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`${variableName} must be an origin without path, query, or fragment.`);
  }

  return parsed.origin;
}

export function resolveTestServerApiOrigin(env = process.env) {
  assertTestModeAllowed(env);
  return parseOrigin(
    requiredTrimmedValue(env, "FIXMATE_TEST_SERVER_API_URL"),
    "FIXMATE_TEST_SERVER_API_URL",
  );
}

export function resolveTestProvisioningConfig(env = process.env) {
  assertTestModeAllowed(env);
  return Object.freeze({
    serverApiOrigin: resolveTestServerApiOrigin(env),
    secret: requiredValue(env, "FIXMATE_TEST_PROVISIONING_SECRET"),
  });
}

export function resolveAuthConfig(env = process.env) {
  const testMode = assertTestModeAllowed(env);

  if (!testMode) {
    return Object.freeze({
      isTestMode: false,
      mongodbUri: requiredTrimmedValue(env, "MONGODB_URI"),
      databaseName: DEFAULT_DATABASE_NAME,
      authOrigin: canonicalAuthOrigin(env),
      betterAuthSecret: null,
    });
  }

  const mongodbUri = resolveTestMongoUri(env);
  const databaseName = resolveTestDatabaseName(env);
  const authOrigin = parseOrigin(
    requiredTrimmedValue(env, "BETTER_AUTH_TEST_URL"),
    "BETTER_AUTH_TEST_URL",
  );
  const betterAuthSecret = requiredValue(env, "BETTER_AUTH_TEST_SECRET");
  const provisioning = resolveTestProvisioningConfig(env);

  return Object.freeze({
    isTestMode: true,
    mongodbUri,
    databaseName,
    authOrigin,
    betterAuthSecret,
    serverApiOrigin: provisioning.serverApiOrigin,
    provisioningSecret: provisioning.secret,
  });
}

export function resolveServiceApiOrigin(env = process.env) {
  if (assertTestModeAllowed(env)) {
    return resolveTestServerApiOrigin(env);
  }

  const configured = env.FIXMATE_SERVER_API_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function resolveProxyApiOrigin(env = process.env) {
  if (assertTestModeAllowed(env)) {
    return resolveTestServerApiOrigin(env);
  }

  const configured = env.FIXMATE_SERVER_API_URL;
  if (typeof configured !== "string" || configured.trim() === "") {
    return null;
  }

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
