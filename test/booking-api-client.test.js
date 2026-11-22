import test from "node:test";
import assert from "node:assert/strict";

import { createBookingApiClient } from "../src/lib/booking-api-client.js";
import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const futureDate = (() => {
  const date = new Date(Date.now() + 72 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
})();

const validInput = {
  serviceId: "507f1f77bcf86cd799439011",
  customerPhone: "5551234567",
  address: "18 Market Street",
  preferredDate: futureDate,
  problemDescription: "The refrigerator is not cooling and makes a grinding noise.",
};

test("booking API client attaches the signed bearer token and omits cookies", async () => {
  const calls = [];
  const api = createBookingApiClient({
    getAccessToken: async () => "signed-token",
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return jsonResponse({ success: true, data: { items: [], total: 0 } });
    },
  });

  const result = await api.listMyBookings({ page: 2, status: "requested" });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/fixmate/bookings/mine?status=requested&page=2&limit=12");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(calls[0].init.headers.get("Cookie"), null);
});

test("booking creation sends only the allowed request fields", async () => {
  const calls = [];
  const api = createBookingApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return jsonResponse({ success: true, data: { _id: "507f1f77bcf86cd799439012" } }, 201);
    },
  });

  await api.createBooking({
    ...validInput,
    customerId: "spoof",
    technicianName: "spoof",
    serviceTitle: "spoof",
    status: "completed",
    paymentStatus: "paid",
    finalAmount: 1,
  });

  assert.equal(calls[0].path, "/api/fixmate/bookings");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body)).sort(), [
    "address",
    "customerPhone",
    "preferredDate",
    "problemDescription",
    "serviceId",
  ]);
  assert.equal(calls[0].init.headers.get("Content-Type"), "application/json");
});

test("cancellation and status updates send only their documented bodies", async () => {
  const calls = [];
  const api = createBookingApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return jsonResponse({ success: true, data: { status: "completed" } });
    },
  });

  await api.cancelBooking("507f1f77bcf86cd799439012");
  await api.updateBookingStatus("507f1f77bcf86cd799439012", "complete", "99.50");

  assert.deepEqual(JSON.parse(calls[0].init.body), {});
  assert.equal(calls[0].path, "/api/fixmate/bookings/507f1f77bcf86cd799439012/cancel");
  assert.deepEqual(JSON.parse(calls[1].init.body), {
    status: "completed",
    finalAmount: 99.5,
  });
  assert.equal(calls[1].path, "/api/fixmate/bookings/507f1f77bcf86cd799439012/status");
});

test("invalid input and invalid ids fail before a network request", async () => {
  let calls = 0;
  const api = createBookingApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ success: true, data: null });
    },
  });

  const invalidCreate = await api.createBooking({ ...validInput, customerPhone: "1" });
  const invalidStatus = await api.updateBookingStatus("bad-id", "complete", 10);
  const invalidComplete = await api.updateBookingStatus(
    "507f1f77bcf86cd799439012",
    "complete",
    -1,
  );

  assert.equal(invalidCreate.ok, false);
  assert.equal(invalidStatus.ok, false);
  assert.equal(invalidComplete.ok, false);
  assert.equal(calls, 0);
});

test("booking API client preserves structured errors for user-facing messages", async () => {
  const api = createBookingApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () =>
      jsonResponse(
        { success: false, error: { code: "CONFLICT", message: "Active booking exists." } },
        409,
      ),
  });

  const result = await api.listMyBookings();

  assert.deepEqual(result, {
    ok: false,
    status: 409,
    code: "CONFLICT",
    message: "Active booking exists.",
  });
});

test("booking API client reports network failures without mock data", async () => {
  const api = createBookingApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  const result = await api.listAdminBookings();

  assert.equal(result.ok, false);
  assert.equal(result.code, "CLIENT_REQUEST_FAILED");
  assert.equal(result.data, undefined);
});
