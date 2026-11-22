import test from "node:test";
import assert from "node:assert/strict";

import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  SERVICE_MANAGEMENT_PROXY_PATH,
  SERVICE_PROXY_METHODS,
  createServiceManagementProxyHandler,
  resolveServiceUpstreamPath,
} from "../src/lib/service-management-proxy.js";
import { SERVICE_UPSTREAM_PATH } from "../src/lib/service-management-contract.js";

const ENV = { FIXMATE_SERVER_API_URL: "https://api.example.com" };
const SERVICE_ID = "507f1f77bcf86cd799439012";
const BODY = JSON.stringify({
  title: "AC repair",
  category: "AC",
  description: "Diagnose and repair cooling faults at the customer location.",
  image: "https://i.imgbb.com/ac.png",
  basePrice: 75,
  estimatedDuration: "1 hour",
  serviceMode: "Home Visit",
  serviceArea: "Dhaka",
  isAvailable: true,
});

function upstreamResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("service proxy maps only documented same-origin paths to real server routes", () => {
  assert.equal(SERVICE_MANAGEMENT_PROXY_PATH, "/api/fixmate/services");
  assert.equal(SERVICE_UPSTREAM_PATH, "/api/services");
  assert.deepEqual([...SERVICE_PROXY_METHODS], ["GET", "POST", "PATCH", "DELETE"]);
  assert.equal(resolveServiceUpstreamPath("GET", []), "/mine");
  assert.equal(resolveServiceUpstreamPath("GET", ["mine"]), "/mine");
  assert.equal(resolveServiceUpstreamPath("POST", []), "");
  assert.equal(resolveServiceUpstreamPath("PATCH", [SERVICE_ID]), `/${SERVICE_ID}`);
  assert.equal(resolveServiceUpstreamPath("DELETE", [SERVICE_ID]), `/${SERVICE_ID}`);
  assert.equal(resolveServiceUpstreamPath("GET", [SERVICE_ID]), null);
  assert.equal(resolveServiceUpstreamPath("PATCH", ["not-an-id"]), null);
  assert.equal(resolveServiceUpstreamPath("DELETE", [SERVICE_ID, "extra"]), null);
  assert.equal(resolveServiceUpstreamPath("PUT", []), null);
});

test("service proxy forwards bearer auth only and rejects unallowed query keys", async () => {
  const calls = [];
  const proxy = createServiceManagementProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({
        success: true,
        data: { items: [], page: 2, limit: 12, total: 0, totalPages: 0 },
      });
    },
  });

  const blockedQuery = await proxy({
    method: "GET",
    segments: ["mine"],
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams("page=2&limit=12&technicianId=spoof"),
  });
  assert.equal(blockedQuery.status, 400);
  assert.equal((await blockedQuery.json()).error.code, "INVALID_QUERY");
  assert.equal(calls.length, 0);

  const response = await proxy({
    method: "GET",
    segments: ["mine"],
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams("page=2&limit=12"),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.page, 2);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.toString(),
    "https://api.example.com/api/services/mine?page=2&limit=12",
  );
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.body, undefined);

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("cookie"), null);
});

test("service proxy strips unallowed write fields and blocks malformed bodies", async () => {
  const calls = [];
  const proxy = createServiceManagementProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({ success: true, data: { _id: SERVICE_ID } }, 201);
    },
  });

  const created = await proxy({
    method: "POST",
    segments: [],
    authorization: "Bearer signed-token",
    body: BODY,
  });
  assert.equal(created.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.toString(), "https://api.example.com/api/services");
  assert.deepEqual(JSON.parse(calls[0].init.body), JSON.parse(BODY));
  assert.equal(new Headers(calls[0].init.headers).get("content-type"), "application/json");

  const spoofed = await proxy({
    method: "PATCH",
    segments: [SERVICE_ID],
    authorization: "Bearer signed-token",
    body: JSON.stringify({ ...JSON.parse(BODY), approvalStatus: "approved" }),
  });
  assert.equal(spoofed.status, 400);
  assert.equal((await spoofed.json()).error.code, "VALIDATION_FAILED");

  const invalidId = await proxy({
    method: "DELETE",
    segments: ["not-an-id"],
    authorization: "Bearer signed-token",
  });
  assert.equal(invalidId.status, 404);

  const tooLarge = await proxy({
    method: "POST",
    segments: [],
    authorization: "Bearer signed-token",
    body: "x".repeat(16 * 1024 + 1),
  });
  assert.equal(tooLarge.status, 413);
  assert.equal(calls.length, 1);
});

test("service proxy returns explicit auth, route, query, config, and outage errors", async () => {
  const proxy = createServiceManagementProxyHandler({
    env: ENV,
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });

  const unauthenticated = await proxy({ method: "GET", segments: ["mine"] });
  const unknownRoute = await proxy({
    method: "GET",
    segments: ["moderation"],
    authorization: "Bearer signed-token",
  });
  const invalidQuery = await proxy({
    method: "GET",
    segments: ["mine"],
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams("status=approved"),
  });
  const unconfigured = createServiceManagementProxyHandler({
    env: {},
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal(unknownRoute.status, 404);
  assert.equal(invalidQuery.status, 400);
  assert.equal(
    (
      await unconfigured({
        method: "GET",
        segments: ["mine"],
        authorization: "Bearer signed-token",
      })
    ).status,
    503,
  );
});

test("service proxy preserves delete conflicts and maps transport failures to 503", async () => {
  const conflictProxy = createServiceManagementProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      upstreamResponse(
        { success: false, error: { code: "CONFLICT", message: "Booking reference exists." } },
        409,
      ),
  });
  const outageProxy = createServiceManagementProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  const conflict = await conflictProxy({
    method: "DELETE",
    segments: [SERVICE_ID],
    authorization: "Bearer signed-token",
  });
  const outage = await outageProxy({
    method: "GET",
    segments: ["mine"],
    authorization: "Bearer signed-token",
  });

  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, "CONFLICT");
  assert.equal(outage.status, 503);
  assert.equal((await outage.json()).error.code, "API_UNAVAILABLE");
});
