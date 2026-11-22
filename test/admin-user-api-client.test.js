import test from "node:test";
import assert from "node:assert/strict";

import { createAdminUserApiClient } from "../src/lib/admin-user-api-client.js";

const USER_ID = "507f1f77bcf86cd799439012";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientFor(response, calls) {
  return createAdminUserApiClient({
    authenticatedFetch: async (path, init) => {
      calls.push({ path, init });
      return response;
    },
  });
}

test("admin user API client lists users through the same-origin BFF", async () => {
  const calls = [];
  const payload = {
    success: true,
    data: {
      items: [{ id: USER_ID, name: "Jane", role: "customer" }],
      page: 2,
      limit: 10,
      total: 11,
      totalPages: 2,
    },
  };
  const client = clientFor(jsonResponse(payload), calls);

  const result = await client.listAdminUsers({
    role: "customer",
    search: "Jane",
    page: 2,
    limit: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.total, 11);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    "/api/fixmate/admin-users?role=customer&search=Jane&page=2&limit=10",
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
});

test("admin user API client inspects one user with a validated id", async () => {
  const calls = [];
  const client = clientFor(
    jsonResponse({ success: true, data: { id: USER_ID, email: "jane@example.com" } }),
    calls,
  );

  const result = await client.getAdminUser(USER_ID);

  assert.equal(result.ok, true);
  assert.equal(result.data.email, "jane@example.com");
  assert.equal(calls[0].path, `/api/fixmate/admin-users/${USER_ID}`);
});

test("admin user API client rejects invalid queries and ids before any request", async () => {
  const calls = [];
  const client = clientFor(jsonResponse({ success: true, data: {} }), calls);

  const badQuery = await client.listAdminUsers({ role: "owner" });
  const badId = await client.getAdminUser("not-an-id");

  assert.deepEqual(badQuery, {
    ok: false,
    status: 400,
    code: "INVALID_ADMIN_USER_QUERY",
    message: "Invalid user list query.",
  });
  assert.deepEqual(badId, {
    ok: false,
    status: 400,
    code: "INVALID_ADMIN_USER_ID",
    message: "Invalid user id.",
  });
  assert.equal(calls.length, 0);
});

test("admin user API client returns structured upstream and transport errors", async () => {
  const forbiddenCalls = [];
  const forbidden = clientFor(
    jsonResponse(
      { success: false, error: { code: "FORBIDDEN", message: "Admin only." } },
      403,
    ),
    forbiddenCalls,
  );
  const network = createAdminUserApiClient({
    authenticatedFetch: async () => {
      throw new Error("offline");
    },
  });

  const forbiddenResult = await forbidden.listAdminUsers();
  const networkResult = await network.listAdminUsers();

  assert.deepEqual(forbiddenResult, {
    ok: false,
    status: 403,
    code: "FORBIDDEN",
    message: "Admin only.",
  });
  assert.equal(networkResult.ok, false);
  assert.equal(networkResult.status, 0);
  assert.equal(networkResult.code, "CLIENT_REQUEST_FAILED");
  assert.equal(forbiddenCalls.length, 1);
});
