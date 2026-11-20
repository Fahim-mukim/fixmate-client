import test from "node:test";
import assert from "node:assert/strict";

import {
  TEST_DATABASE_NAME,
  isTestMode,
  resolveAuthConfig,
  resolveProxyApiOrigin,
  resolveServiceApiOrigin,
} from "../src/lib/test-mode.js";

const TEST_URI = "mongodb://127.0.0.1:27017/fixmate_auth_test";
const PRODUCTION_URI = "mongodb://production.invalid:27017/fixmate";

const TEST_ENV = Object.freeze({
  FIXMATE_TEST_MODE: "true",
  FIXMATE_TEST_MONGODB_URI: TEST_URI,
  FIXMATE_TEST_DATABASE_NAME: TEST_DATABASE_NAME,
  FIXMATE_TEST_PROVISIONING_SECRET: "test-only-provisioning-secret",
  BETTER_AUTH_TEST_URL: "http://localhost:3000",
  BETTER_AUTH_TEST_SECRET: "test-only-better-auth-secret",
  FIXMATE_TEST_SERVER_API_URL: "http://localhost:5000",
  // Incompatible production values are present to detect any fallback.
  MONGODB_URI: PRODUCTION_URI,
  BETTER_AUTH_URL: "https://production.invalid",
  BETTER_AUTH_SECRET: "production-better-auth-secret",
  FIXMATE_SERVER_API_URL: "https://api.production.invalid",
  FIXMATE_PROVISIONING_SECRET: "production-provisioning-secret",
});

function withEnv(overrides = {}) {
  return { ...TEST_ENV, ...overrides };
}

function withoutEnv(key) {
  const env = { ...TEST_ENV };
  delete env[key];
  return env;
}

test("test mode is enabled only by the exact gate value", () => {
  assert.equal(isTestMode(TEST_ENV), true);
  assert.equal(isTestMode(withEnv({ FIXMATE_TEST_MODE: "false" })), false);
  assert.equal(isTestMode(withoutEnv("FIXMATE_TEST_MODE")), false);
  assert.throws(
    () => isTestMode(withEnv({ FIXMATE_TEST_MODE: "TRUE" })),
    /FIXMATE_TEST_MODE must be true, false, or unset/,
  );
});

test("test mode disabled preserves the existing production configuration path", () => {
  const config = resolveAuthConfig(withEnv({ FIXMATE_TEST_MODE: "false" }));

  assert.equal(config.isTestMode, false);
  assert.equal(config.mongodbUri, PRODUCTION_URI);
  assert.equal(config.databaseName, "fixmate");
  assert.equal(config.authOrigin, "https://production.invalid");
  assert.equal(config.betterAuthSecret, null);
});

test("valid test mode selects the exact test database and uses only test values", () => {
  const config = resolveAuthConfig(TEST_ENV);

  assert.equal(TEST_DATABASE_NAME, "fixmate_auth_test");
  assert.equal(config.isTestMode, true);
  assert.equal(config.databaseName, TEST_DATABASE_NAME);
  assert.equal(config.mongodbUri, TEST_URI);
  assert.notEqual(config.mongodbUri, TEST_ENV.MONGODB_URI);
  assert.equal(config.authOrigin, TEST_ENV.BETTER_AUTH_TEST_URL);
  assert.notEqual(config.authOrigin, TEST_ENV.BETTER_AUTH_URL);
  assert.equal(config.betterAuthSecret, TEST_ENV.BETTER_AUTH_TEST_SECRET);
  assert.notEqual(config.betterAuthSecret, TEST_ENV.BETTER_AUTH_SECRET);
  assert.equal(config.serverApiOrigin, TEST_ENV.FIXMATE_TEST_SERVER_API_URL);
  assert.notEqual(config.serverApiOrigin, TEST_ENV.FIXMATE_SERVER_API_URL);
  assert.equal(config.provisioningSecret, TEST_ENV.FIXMATE_TEST_PROVISIONING_SECRET);
  assert.notEqual(config.provisioningSecret, TEST_ENV.FIXMATE_PROVISIONING_SECRET);
});

test("test mode requires a test MongoDB URI and never falls back to MONGODB_URI", () => {
  assert.throws(
    () => resolveAuthConfig(withoutEnv("FIXMATE_TEST_MONGODB_URI")),
    /FIXMATE_TEST_MONGODB_URI is required/,
  );
});

test("test mode requires an explicit test database name", () => {
  assert.throws(
    () => resolveAuthConfig(withoutEnv("FIXMATE_TEST_DATABASE_NAME")),
    /FIXMATE_TEST_DATABASE_NAME is required/,
  );
});

test("test mode rejects an incorrect database name", () => {
  assert.throws(
    () => resolveAuthConfig(withEnv({ FIXMATE_TEST_DATABASE_NAME: "fixmate" })),
    /FIXMATE_TEST_DATABASE_NAME must be fixmate_auth_test/,
  );
});

test("test mode rejects a MongoDB URI without an explicit database path", () => {
  assert.throws(
    () => resolveAuthConfig(withEnv({ FIXMATE_TEST_MONGODB_URI: "mongodb://127.0.0.1:27017" })),
    /FIXMATE_TEST_MONGODB_URI must include an explicit database path/,
  );
});

test("test mode rejects a MongoDB URI targeting the existing application database", () => {
  assert.throws(
    () => resolveAuthConfig(withEnv({ FIXMATE_TEST_MONGODB_URI: PRODUCTION_URI })),
    /FIXMATE_TEST_MONGODB_URI must target fixmate_auth_test/,
  );
});

test("test mode requires both test-only Better Auth values", () => {
  assert.throws(
    () => resolveAuthConfig(withoutEnv("BETTER_AUTH_TEST_URL")),
    /BETTER_AUTH_TEST_URL is required/,
  );
  assert.throws(
    () => resolveAuthConfig(withoutEnv("BETTER_AUTH_TEST_SECRET")),
    /BETTER_AUTH_TEST_SECRET is required/,
  );
});

test("test mode requires the test server API URL and provisioning secret", () => {
  assert.throws(
    () => resolveAuthConfig(withoutEnv("FIXMATE_TEST_SERVER_API_URL")),
    /FIXMATE_TEST_SERVER_API_URL is required/,
  );
  assert.throws(
    () => resolveAuthConfig(withoutEnv("FIXMATE_TEST_PROVISIONING_SECRET")),
    /FIXMATE_TEST_PROVISIONING_SECRET is required/,
  );
});

test("test-mode API origin resolvers never use the production API URL", () => {
  assert.equal(resolveServiceApiOrigin(TEST_ENV), TEST_ENV.FIXMATE_TEST_SERVER_API_URL);
  assert.equal(resolveProxyApiOrigin(TEST_ENV), TEST_ENV.FIXMATE_TEST_SERVER_API_URL);
  assert.throws(
    () => resolveServiceApiOrigin(withoutEnv("FIXMATE_TEST_SERVER_API_URL")),
    /FIXMATE_TEST_SERVER_API_URL is required/,
  );
  assert.throws(
    () => resolveProxyApiOrigin(withoutEnv("FIXMATE_TEST_SERVER_API_URL")),
    /FIXMATE_TEST_SERVER_API_URL is required/,
  );
});

test("test mode is rejected when NODE_ENV is production", () => {
  assert.throws(
    () => resolveAuthConfig(withEnv({ NODE_ENV: "production" })),
    /FIXMATE_TEST_MODE cannot be enabled when NODE_ENV=production/,
  );
});

test("test-mode validation errors do not expose credentials or secrets", () => {
  const marker = "never-print-this-value";
  const hostileEnv = withEnv({
    FIXMATE_TEST_MONGODB_URI: `mongodb://user:${marker}@127.0.0.1:27017/fixmate`,
  });

  assert.throws(
    () => resolveAuthConfig(hostileEnv),
    (error) => {
      assert.match(error.message, /FIXMATE_TEST_MONGODB_URI must target fixmate_auth_test/);
      assert.equal(error.message.includes(marker), false);
      return true;
    },
  );

  assert.throws(
    () => resolveAuthConfig(withEnv({ BETTER_AUTH_TEST_SECRET: "" })),
    (error) => {
      assert.match(error.message, /BETTER_AUTH_TEST_SECRET is required/);
      assert.equal(error.message.includes(TEST_ENV.BETTER_AUTH_TEST_SECRET), false);
      assert.equal(error.message.includes(TEST_ENV.BETTER_AUTH_SECRET), false);
      return true;
    },
  );
});
