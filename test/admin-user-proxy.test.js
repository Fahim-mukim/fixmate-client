import test from "node:test";
import assert from "node:assert/strict";

import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  ADMIN_USER_PROXY_METHODS,
  ADMIN_USER_PROXY_PATH,
  createAdminUserProxyHandler,
  resolveAdminUserUpstreamPath,
} from "../src/lib/admin-user-proxy.js";
import { ADMIN_USER_UPSTREAM_PATH } from "../src/lib/admin-user-contract.js";

const ENV = { FIXMATE_SERVER_API_URL: "https://api.example.com" };
const USER_ID = "507f1f77bcf86cd799439012";

function upstreamResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("admin user proxy maps only list and detail GET routes", () => {
  assert.equal(ADMIN_USER_PROXY_PATH, "/api/fixmate/admin-users");
  assert.equal(ADMIN_USER_UPSTREAM_PATH, "/api/admin/users");
  assert.deepEqual([...ADMIN_USER_PROXY_METHODS], ["GET"]);
  assert.equal(resolveAdminUserUpstreamPath("GET", []), "");
  assert.equal(resolveAdminUserUpstreamPath("GET", [USER_ID]), `/${USER_ID}`);
  assert.equal(resolveAdminUserUpstreamPath("GET", ["not-an-id"]), null);
  assert.equal(resolveAdminUserUpstreamPath("GET", [USER_ID, "extra"]), null);
  assert.equal(resolveAdminUserUpstreamPath("POST", []), null);
  assert.equal(resolveAdminUserUpstreamPath("PATCH", [USER_ID]), null);
  assert.equal(resolveAdminUserUpstreamPath("DELETE", [USER_ID]), null);
});

test("admin user proxy forwards a Bearer token only and allowlisted queries", async () => {
  const calls = [];
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({
        success: true,
        data: { items: [], page: 2, limit: 12, total: 0, totalPages: 0 },
      });
    },
  });

  const response = await proxy({
    method: "GET",
    segments: [],
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams(
      "role=customer&search=Jane&page=2&limit=12",
    ),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.page, 2);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.toString(),
    `https://api.example.com/api/admin/users?role=customer&search=Jane&page=2&limit=12`,
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.body, undefined);

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("content-type"), null);
});

test("admin user proxy rejects unsupported routes and queries before fetching", async () => {
  const calls = [];
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({ success: true, data: {} });
    },
  });

  const cases = [
    { method: "GET", segments: ["bad-id"] },
    { method: "POST", segments: [] },
    { method: "GET", segments: [], searchParams: new URLSearchParams("role=owner") },
    { method: "GET", segments: [], searchParams: new URLSearchParams("page=0") },
    { method: "GET", segments: [], searchParams: new URLSearchParams("limit=51") },
    { method: "GET", segments: [], searchParams: new URLSearchParams("userId=spoof") },
    {
      method: "GET",
      segments: [],
      searchParams: new URLSearchParams("role=customer&role=admin"),
    },
    {
      method: "GET",
      segments: [],
      searchParams: new URLSearchParams("search=" + "x".repeat(101)),
    },
  ];

  for (const input of cases) {
    const response = await proxy({
      authorization: "Bearer signed-token",
      ...input,
    });
    assert.ok(
      [400, 404, 405].includes(response.status),
      `unexpected status ${response.status}`,
    );
  }
  assert.equal(calls.length, 0);
});

test("admin user proxy maps auth, config, transport, and response-limit failures", async () => {
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });
  const unconfigured = createAdminUserProxyHandler({
    env: {},
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });
  const failed = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  const oversized = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async () => upstreamResponse({ blob: "x".repeat(1024 * 1024 + 1) }),
  });

  const unauthenticated = await proxy({ method: "GET", segments: [] });
  const unconfiguredResponse = await unconfigured({
    method: "GET",
    segments: [],
    authorization: "Bearer signed-token",
  });
  const failedResponse = await failed({
    method: "GET",
    segments: [],
    authorization: "Bearer signed-token",
  });
  const oversizedResponse = await oversized({
    method: "GET",
    segments: [],
    authorization: "Bearer signed-token",
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(unconfiguredResponse.status, 503);
  assert.equal(failedResponse.status, 503);
  assert.equal((await failedResponse.json()).error.code, "API_UNAVAILABLE");
  assert.equal(oversizedResponse.status, 502);
  assert.equal((await oversizedResponse.json()).error.code, "RESPONSE_TOO_LARGE");
});

test("admin user proxy preserves upstream errors and success bodies", async () => {
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      upstreamResponse(
        { success: false, error: { code: "FORBIDDEN", message: "This role is not allowed." } },
        403,
      ),
  });

  const response = await proxy({
    method: "GET",
    segments: [],
    authorization: "Bearer signed-token",
  });

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "FORBIDDEN");
});
