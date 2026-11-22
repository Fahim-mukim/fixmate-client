import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBookingListQuery } from "../src/lib/booking-contract.js";
import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  BOOKINGS_PROXY_PATH,
  createBookingProxyHandler,
  resolveBookingQuery,
  resolveUpstreamPath,
} from "../src/lib/booking-proxy.js";

const root = fileURLToPath(new URL("../", import.meta.url));
function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function upstreamResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("admin booking page and navigation link are restricted to the admin role", () => {
  const page = source("src/app/dashboard/admin/bookings/page.js");
  assert.match(page, /DashboardGate/);
  assert.match(page, /expectedRole="admin"/);
  assert.match(page, /<AdminBookingsPanel \/>/);

  const navigation = source("src/lib/dashboard-navigation.js");
  const adminSection = navigation.slice(navigation.indexOf("admin: Object.freeze"));
  const customerSection = navigation.slice(
    navigation.indexOf("customer: Object.freeze"),
    navigation.indexOf("technician: Object.freeze"),
  );
  const technicianSection = navigation.slice(
    navigation.indexOf("technician: Object.freeze"),
    navigation.indexOf("admin: Object.freeze"),
  );

  assert.match(adminSection, /href: "\/dashboard\/admin\/bookings", label: "Bookings"/);
  assert.ok(!customerSection.includes("/dashboard/admin/bookings"));
  assert.ok(!technicianSection.includes("/dashboard/admin/bookings"));
});

test("booking BFF exposes the admin list only and rejects admin mutation shapes", () => {
  assert.equal(resolveUpstreamPath("GET", ["admin"]), "/admin");
  assert.equal(resolveUpstreamPath("GET", ["admin", "507f1f77bcf86cd799439012"]), null);

  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    assert.equal(resolveUpstreamPath(method, ["admin"]), null, method);
  }
  assert.equal(resolveUpstreamPath("DELETE", ["507f1f77bcf86cd799439012"]), null);
});

test("admin booking query accepts only documented status, page and limit values", () => {
  const valid = resolveBookingQuery(
    new URLSearchParams("status=completed&page=2&limit=12"),
  );
  assert.equal(valid.toString(), "status=completed&page=2&limit=12");
  assert.equal(resolveBookingQuery(new URLSearchParams()).toString(), "");

  for (const rejected of [
    "paymentStatus=paid",
    "search=smartphone",
    "customerId=spoof",
    "status=unknown",
    "status=requested&status=accepted",
    "page=0",
    "page=100001",
    "limit=0",
    "limit=51",
  ]) {
    assert.equal(resolveBookingQuery(new URLSearchParams(rejected)), null, rejected);
  }
});

test("admin booking list forwards a bearer token only and preserves the structured response", async () => {
  const calls = [];
  const payload = {
    success: true,
    data: {
      items: [{ _id: "507f1f77bcf86cd799439012", status: "completed" }],
      page: 2,
      limit: 12,
      total: 1,
      totalPages: 1,
    },
  };
  const proxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return upstreamResponse(payload);
    },
  });

  const response = await proxy({
    method: "GET",
    segments: ["admin"],
    authorization: "Bearer admin-token",
    searchParams: new URLSearchParams("status=completed&page=2&limit=12"),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), payload);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://api.example.com");
  assert.equal(calls[0].url.pathname, "/api/bookings/admin");
  assert.equal(calls[0].url.searchParams.get("status"), "completed");
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("limit"), "12");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers[AUTHORIZATION_HEADER], "Bearer admin-token");
  assert.equal(calls[0].init.headers.Cookie, undefined);
  assert.equal(calls[0].init.credentials, undefined);
});

test("admin booking BFF rejects missing auth and invalid queries before calling upstream", async () => {
  let calls = 0;
  const proxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () => {
      calls += 1;
      return upstreamResponse({ success: true, data: {} });
    },
  });

  const unauthenticated = await proxy({
    method: "GET",
    segments: ["admin"],
  });
  const invalidQuery = await proxy({
    method: "GET",
    segments: ["admin"],
    authorization: "Bearer admin-token",
    searchParams: new URLSearchParams("paymentStatus=paid"),
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(invalidQuery.status, 400);
  assert.equal((await invalidQuery.json()).error.code, "INVALID_QUERY");
  assert.equal(calls, 0);
});

test("admin booking BFF caps oversized upstream responses", async () => {
  const proxy = createBookingProxyHandler({
    env: { FIXMATE_SERVER_API_URL: "https://api.example.com" },
    fetchImpl: async () =>
      new Response("x".repeat(1024 * 1024 + 1), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });

  const response = await proxy({
    method: "GET",
    segments: ["admin"],
    authorization: "Bearer admin-token",
  });

  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, "RESPONSE_TOO_LARGE");
});

test("admin booking client sends no mutations and drops unsupported filters", () => {
  const query = buildBookingListQuery({
    status: "completed",
    page: 2,
    limit: 12,
    paymentStatus: "paid",
    search: "phone",
    customerId: "spoof",
  });
  assert.deepEqual(query, { status: "completed", page: 2, limit: 12 });

  const panel = source("src/components/dashboard/admin-bookings-panel.jsx");
  const apiCalls = panel.match(/bookingApi\.\w+/g) ?? [];
  assert.deepEqual([...new Set(apiCalls)], ["bookingApi.listAdminBookings"]);
  assert.ok(!panel.includes("PATCH"));
  assert.ok(!panel.includes("DELETE"));
  assert.ok(!panel.includes("paymentStatus:"));

  assert.match(BOOKINGS_PROXY_PATH, /^\/api\/fixmate\/bookings$/);
});

test("admin booking UI covers list, states, filters, image, pagination and detail inspection", () => {
  const panel = source("src/components/dashboard/admin-bookings-panel.jsx");
  for (const token of [
    "bookingApi.listAdminBookings",
    "BookingFilters",
    "BookingSummary",
    "BookingLoading",
    "BookingEmpty",
    "BookingError",
    "onRetry",
    "BookingPagination",
    "BookingDetail",
    'role="admin"',
    "ServiceImage",
    "booking.serviceImage",
    "bookingPaymentLabel(booking.paymentStatus)",
    "formatBookingDate(booking.preferredDate)",
    "booking.finalAmount ?? booking.basePrice",
    "sm:grid-cols-2 xl:grid-cols-4",
  ]) {
    assert.ok(panel.includes(token), `Admin booking panel is missing ${token}`);
  }

  const detail = source("src/components/dashboard/booking-detail.jsx");
  for (const token of [
    "bookingReference(booking._id)",
    "formatBookingDate(booking.createdAt",
    "shown.serviceTitle",
    "shown.technicianName",
    "shown.technicianEmail",
    "shown.customerName",
    "shown.customerEmail",
    "shown.customerPhone",
    "shown.address",
    "shown.problemDescription",
    "bookingPaymentLabel(shown.paymentStatus)",
    "formatBookingAmount(shown.finalAmount)",
  ]) {
    assert.ok(detail.includes(token), `Booking detail is missing ${token}`);
  }
});

test("existing customer cancellation and technician transition workflows remain intact", () => {
  const customer = source("src/components/dashboard/customer-bookings-panel.jsx");
  assert.match(customer, /canCustomerCancel/);
  assert.match(customer, /bookingApi\.cancelBooking/);

  const technician = source("src/components/dashboard/technician-requests-panel.jsx");
  assert.match(technician, /getTechnicianActions/);
  assert.match(technician, /bookingApi\.updateBookingStatus/);

  const id = "507f1f77bcf86cd799439012";
  assert.equal(
    resolveUpstreamPath("PATCH", [id, "cancel"]),
    `/${id}/cancel`,
  );
  assert.equal(
    resolveUpstreamPath("PATCH", [id, "status"]),
    `/${id}/status`,
  );
});
