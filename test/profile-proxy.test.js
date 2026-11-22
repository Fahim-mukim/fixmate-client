import test from "node:test";
import assert from "node:assert/strict";

import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  PROFILE_PROXY_PATH,
  PROFILE_UPSTREAM_PATH,
  createProfileProxyHandler,
  resolveServerApiOrigin,
} from "../src/lib/profile-proxy.js";

test("profile proxy constants stay on the documented same-origin and server paths", () => {
  assert.equal(PROFILE_PROXY_PATH, "/api/fixmate/profile");
  assert.equal(PROFILE_UPSTREAM_PATH, "/api/profile");
});

test("profile proxy validates the configured server origin", () => {
  assert.equal(
    resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "https://api.example.com/" }),
    "https://api.example.com",
  );
  assert.equal(
    resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "https://user:pass@api.example.com" }),
    null,
  );
  assert.equal(
    resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "https://api.example.com/base" }),
    null,
  );
  assert.equal(
    resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "file:///etc/passwd" }),
    null,
  );
  assert.equal(resolveServerApiOrigin({}), null);
});

test("profile proxy rejects missing tokens and unsupported methods", async () => {
  const handle = createProfileProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () => {
      throw new Error("unexpected fetch");
    },
  });

  const unauthorized = await handle({ method: "GET", authorization: null });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error.code, "AUTHENTICATION_REQUIRED");

  const wrongMethod = await handle({
    method: "DELETE",
    authorization: "Bearer signed-token",
  });
  assert.equal(wrongMethod.status, 405);
  assert.equal((await wrongMethod.json()).error.code, "METHOD_NOT_ALLOWED");
});

test("profile proxy forwards the Bearer token and allowlisted body without cookies", async () => {
  const calls = [];
  const handle = createProfileProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({ success: true, data: { name: "Updated Name" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const response = await handle({
    method: "PATCH",
    authorization: "Bearer signed-token",
    body: JSON.stringify({ name: "Updated Name" }),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { name: "Updated Name" },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.toString(), "https://api.example.com/api/profile");
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[0].init.body, JSON.stringify({ name: "Updated Name" }));
  assert.equal(calls[0].init.cache, "no-store");

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("cookie"), null);
});

test("profile proxy GET has no body and passes upstream status through", async () => {
  const calls = [];
  const handle = createProfileProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "PROFILE_NOT_FOUND", message: "Profile not found." },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const response = await handle({
    method: "GET",
    authorization: "Bearer signed-token",
  });

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "PROFILE_NOT_FOUND");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(new Headers(calls[0].init.headers).get("content-type"), null);
});

test("profile proxy fails closed for missing config, large bodies, and outages", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    throw new Error("offline");
  };

  const unconfigured = createProfileProxyHandler({ env: {}, fetchImpl });
  const unconfiguredResponse = await unconfigured({
    method: "GET",
    authorization: "Bearer signed-token",
  });
  assert.equal(unconfiguredResponse.status, 503);
  assert.equal((await unconfiguredResponse.json()).error.code, "API_CONFIGURATION");

  const configured = createProfileProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl,
  });
  const largeResponse = await configured({
    method: "PATCH",
    authorization: "Bearer signed-token",
    body: "x".repeat(16385),
  });
  assert.equal(largeResponse.status, 413);
  assert.equal((await largeResponse.json()).error.code, "PAYLOAD_TOO_LARGE");

  const outageResponse = await configured({
    method: "GET",
    authorization: "Bearer signed-token",
  });
  assert.equal(outageResponse.status, 503);
  assert.equal((await outageResponse.json()).error.code, "API_UNAVAILABLE");
  assert.equal(fetchCount, 1);
});
