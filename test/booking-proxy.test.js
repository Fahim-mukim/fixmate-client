import test from "node:test";
import assert from "node:assert/strict";

import {
  BOOKINGS_PROXY_PATH,
  createBookingProxyHandler,
  createBookingProxyRequest,
  resolveServerApiOrigin,
  resolveUpstreamPath,
} from "../src/lib/booking-proxy.js";
import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";

function upstreamResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("booking proxy requests allow only documented path shapes and query keys", () => {
  assert.equal(
    createBookingProxyRequest({
      segments: ["technician", "507f1f77bcf86cd799439012"],
      query: { status: "requested", page: 2, customerId: "spoof" },
    }),
    `${BOOKINGS_PROXY_PATH}/technician/507f1f77bcf86cd799439012?status=requested&page=2`,
  );
  assert.equal(
    resolveUpstreamPath("POST", []),
    "",
  );
  assert.equal(
    resolveUpstreamPath("GET", ["mine"]),
    "/mine",
  );
  assert.equal(
    resolveUpstreamPath("PATCH", ["507f1f77bcf86cd799439012", "status"]),
    "/507f1f77bcf86cd799439012/status",
  );
  assert.equal(resolveUpstreamPath("PATCH", ["507f1f77bcf86cd799439012", "admin"]), null);
  assert.equal(resolveUpstreamPath("GET", ["activeBookingKey"]), null);
});

test("server API origin validation requires a bare http(s) origin", () => {
  assert.equal(resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "https://api.example.com" }), "https://api.example.com");
  assert.equal(resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "https://api.example.com/api" }), null);
  assert.equal(resolveServerApiOrigin({ FIXMATE_SERVER_API_URL: "ftp://api.example.com" }), null);
  assert.equal(resolveServerApiOrigin({}), null);
});

test("booking proxy forwards bearer auth and no browser cookies to Express", async () => {
  const calls = [];
  const proxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse({ success: true, data: { items: [], total: 0 } });
    },
  });

  const response = await proxy({
    method: "PATCH",
    segments: ["507f1f77bcf86cd799439012", "cancel"],
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams("page=2&customerId=spoof"),
    body: "{}",
  });

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://api.example.com");
  assert.equal(calls[0].url.pathname, "/api/bookings/507f1f77bcf86cd799439012/cancel");
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("customerId"), null);
  assert.equal(calls[0].init.headers[AUTHORIZATION_HEADER], "Bearer signed-token");
  assert.equal(calls[0].init.headers.Cookie, undefined);
  assert.equal(calls[0].init.credentials, undefined);
});

test("booking proxy returns explicit auth, route and configuration errors", async () => {
  const proxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });

  const unauthenticated = await proxy({ method: "GET", segments: ["mine"], authorization: null });
  const unknownRoute = await proxy({
    method: "GET",
    segments: ["activeBookingKey"],
    authorization: "Bearer token",
  });
  const unconfigured = createBookingProxyHandler({
    env: {},
    fetchImpl: async () => upstreamResponse({ success: true, data: {} }),
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal(unknownRoute.status, 404);
  assert.equal(
    (await unconfigured({ method: "GET", segments: ["mine"], authorization: "Bearer token" })).status,
    503,
  );
});

test("booking proxy preserves upstream conflicts and maps outages to 503", async () => {
  const conflictProxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () =>
      upstreamResponse(
        { success: false, error: { code: "CONFLICT", message: "Active booking exists." } },
        409,
      ),
  });
  const outageProxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  const conflict = await conflictProxy({
    method: "POST",
    segments: [],
    authorization: "Bearer token",
    body: "{}",
  });
  const outage = await outageProxy({
    method: "GET",
    segments: ["admin"],
    authorization: "Bearer token",
  });

  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.message, "Active booking exists.");
  assert.equal(outage.status, 503);
  assert.equal((await outage.json()).error.code, "API_UNAVAILABLE");
});
