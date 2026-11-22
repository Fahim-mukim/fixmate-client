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

test("admin user proxy maps list, detail GET, and role PATCH routes", () => {
  assert.equal(ADMIN_USER_PROXY_PATH, "/api/fixmate/admin-users");
  assert.equal(ADMIN_USER_UPSTREAM_PATH, "/api/admin/users");
  assert.deepEqual([...ADMIN_USER_PROXY_METHODS], ["GET", "PATCH"]);
  assert.equal(resolveAdminUserUpstreamPath("GET", []), "");
  assert.equal(resolveAdminUserUpstreamPath("GET", [USER_ID]), `/${USER_ID}`);
  assert.equal(resolveAdminUserUpstreamPath("GET", ["not-an-id"]), null);
  assert.equal(resolveAdminUserUpstreamPath("GET", [USER_ID, "extra"]), null);
  assert.equal(
    resolveAdminUserUpstreamPath("PATCH", [USER_ID, "role"]),
    `/${USER_ID}/role`,
  );
  assert.equal(resolveAdminUserUpstreamPath("PATCH", [USER_ID]), null);
  assert.equal(resolveAdminUserUpstreamPath("PATCH", ["not-an-id", "role"]), null);
  assert.equal(resolveAdminUserUpstreamPath("PATCH", [USER_ID, "email"]), null);
  assert.equal(resolveAdminUserUpstreamPath("POST", []), null);
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

test("admin user proxy forwards a validated role patch and strips unsafe fields", async () => {
  const calls = [];
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({
        success: true,
        data: {
          id: USER_ID,
          name: "Jane",
          email: "jane@example.com",
          role: "technician",
          passwordHash: "never-exposed",
          sessionToken: "never-exposed",
        },
      });
    },
  });

  const response = await proxy({
    method: "PATCH",
    segments: [USER_ID, "role"],
    authorization: "Bearer signed-token",
    body: JSON.stringify({ role: "technician" }),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.role, "technician");
  assert.equal(payload.data.passwordHash, undefined);
  assert.equal(payload.data.sessionToken, undefined);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.toString(),
    `https://api.example.com/api/admin/users/${USER_ID}/role`,
  );
  assert.equal(calls[0].url.search, "");
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[0].init.body, JSON.stringify({ role: "technician" }));
  assert.equal(calls[0].init.cache, "no-store");

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("cookie"), null);
});

test("admin user proxy rejects invalid role patches before fetching", async () => {
  const calls = [];
  const proxy = createAdminUserProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({ success: true, data: {} });
    },
  });

  const cases = [
    { segments: [USER_ID, "role"] },
    { segments: [USER_ID, "role"], body: "{}" },
    { segments: [USER_ID, "role"], body: JSON.stringify({ role: "owner" }) },
    { segments: [USER_ID, "role"], body: JSON.stringify({ role: "admin", userId: USER_ID }) },
    { segments: [USER_ID, "role"], body: JSON.stringify(["admin"]) },
    { segments: [USER_ID, "role"], body: "not-json" },
    { segments: [USER_ID, "role"], body: "x".repeat(16 * 1024 + 1) },
    {
      segments: [USER_ID, "role"],
      body: JSON.stringify({ role: "admin" }),
      searchParams: new URLSearchParams("role=admin"),
    },
  ];

  for (const input of cases) {
    const response = await proxy({
      method: "PATCH",
      authorization: "Bearer signed-token",
      ...input,
    });
    assert.equal(response.status, 400, JSON.stringify(input));
    const payload = await response.json();
    assert.ok(["INVALID_BODY", "INVALID_QUERY"].includes(payload.error.code));
  }

  const unauthenticated = await proxy({
    method: "PATCH",
    segments: [USER_ID, "role"],
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(calls.length, 0);
});

test("admin user proxy preserves upstream unauthorized and forbidden role errors", async () => {
  for (const [status, code] of [
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "SELF_ROLE_CHANGE_FORBIDDEN"],
  ]) {
    const proxy = createAdminUserProxyHandler({
      env: ENV,
      fetchImpl: async () =>
        upstreamResponse(
          { success: false, error: { code, message: "Rejected by server." } },
          status,
        ),
    });

    const response = await proxy({
      method: "PATCH",
      segments: [USER_ID, "role"],
      authorization: "Bearer signed-token",
      body: JSON.stringify({ role: "customer" }),
    });

    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});
