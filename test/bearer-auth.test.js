import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTHORIZATION_HEADER,
  authenticatedHeaders,
  bearerAuthorization,
  extractBearerToken,
} from "../src/lib/bearer-auth.js";
import {
  buildAuthenticatedRequestInit,
  createAuthenticatedFetch,
} from "../src/lib/authenticated-api.js";

test("bearer helpers build and parse only well-formed Authorization values", () => {
  assert.equal(bearerAuthorization("token-1"), "Bearer token-1");
  assert.equal(extractBearerToken("bearer token-1"), "token-1");
  assert.equal(extractBearerToken("Basic token-1"), null);
  assert.equal(extractBearerToken("Bearer"), null);
  assert.equal(extractBearerToken("Bearer token-1 extra"), null);
  assert.throws(() => bearerAuthorization(""), /bearer token is required/);
});

test("authenticatedHeaders sets bearer auth, JSON accept, and no cookies", () => {
  const headers = authenticatedHeaders("token-1", { "X-Test": "yes" });

  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer token-1");
  assert.equal(headers.get("Accept"), "application/json");
  assert.equal(headers.get("X-Test"), "yes");
  assert.equal(headers.get("Cookie"), null);
});

test("authenticated fetch omits browser credentials and preserves caller options", async () => {
  const calls = [];
  const authenticatedFetch = createAuthenticatedFetch({
    getAccessToken: async () => "token-2",
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return { ok: true };
    },
  });

  await authenticatedFetch("/api/fixmate/me", { method: "GET" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/fixmate/me");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.headers.get(AUTHORIZATION_HEADER), "Bearer token-2");
});

test("authenticated request builder rejects a missing token provider", () => {
  const init = buildAuthenticatedRequestInit({ token: "token-3" });
  assert.equal(init.headers.get(AUTHORIZATION_HEADER), "Bearer token-3");
  assert.throws(() => createAuthenticatedFetch({}), /getAccessToken is required/);
});
