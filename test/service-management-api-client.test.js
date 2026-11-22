import test from "node:test";
import assert from "node:assert/strict";

import { createServiceManagementApiClient } from "../src/lib/service-management-api-client.js";
import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";

const SERVICE_ID = "507f1f77bcf86cd799439012";
const IMAGE_URL = "https://i.imgbb.com/service.png";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validForm(overrides = {}) {
  return {
    title: "AC repair",
    category: "AC",
    description: "Diagnose and repair cooling faults at the customer location.",
    image: IMAGE_URL,
    basePrice: "75.25",
    estimatedDuration: "1 hour",
    serviceMode: "Home Visit",
    serviceArea: "Dhaka",
    isAvailable: true,
    ...overrides,
  };
}

function clientWithCalls(calls, responseFactory = () => jsonResponse({ success: true, data: {} })) {
  return createServiceManagementApiClient({
    getAccessToken: async () => "signed-token",
    fetchImpl: async (path, init) => {
      calls.push({ path, init });
      return responseFactory();
    },
  });
}

test("service API client reads owned services through the authenticated same-origin proxy", async () => {
  const calls = [];
  const api = clientWithCalls(
    calls,
    () =>
      jsonResponse({
        success: true,
        data: { items: [], page: 2, limit: 12, total: 0, totalPages: 0 },
      }),
  );

  const result = await api.listOwnedServices({ page: 2, limit: 12 });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { items: [], page: 2, limit: 12, total: 0, totalPages: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/fixmate/services?page=2&limit=12");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(calls[0].init.headers.get("Cookie"), null);
});

test("service API client sends only allowlisted create and edit fields", async () => {
  const calls = [];
  const api = clientWithCalls(
    calls,
    () => jsonResponse({ success: true, data: { _id: SERVICE_ID } }, 201),
  );

  const created = await api.createService({
    ...validForm(),
    technicianId: "spoof",
    approvalStatus: "approved",
  });
  const updated = await api.updateService(SERVICE_ID, { ...validForm(), isAvailable: false });

  assert.equal(created.ok, true);
  assert.equal(updated.ok, true);
  assert.equal(calls[0].path, "/api/fixmate/services");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[1].path, `/api/fixmate/services/${SERVICE_ID}`);
  assert.equal(calls[1].init.method, "PATCH");

  for (const call of calls) {
    const body = JSON.parse(call.init.body);
    assert.deepEqual(Object.keys(body).sort(), [
      "basePrice",
      "category",
      "description",
      "estimatedDuration",
      "image",
      "isAvailable",
      "serviceArea",
      "serviceMode",
      "title",
    ]);
    assert.equal(body.basePrice, 75.25);
    assert.equal(body.technicianId, undefined);
    assert.equal(body.approvalStatus, undefined);
    assert.equal(call.init.headers.get("content-type"), "application/json");
  }
  assert.equal(JSON.parse(calls[1].init.body).isAvailable, false);
});

test("service API client deletes only a validated owned-service id", async () => {
  const calls = [];
  const api = clientWithCalls(
    calls,
    () => jsonResponse({ success: true, data: { id: SERVICE_ID, deleted: true } }),
  );

  const deleted = await api.deleteService(SERVICE_ID);

  assert.deepEqual(deleted, { ok: true, data: { id: SERVICE_ID, deleted: true } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, `/api/fixmate/services/${SERVICE_ID}`);
  assert.equal(calls[0].init.method, "DELETE");
  assert.equal(calls[0].init.body, undefined);
});

test("service API client blocks invalid input before any request", async () => {
  let calls = 0;
  const api = createServiceManagementApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ success: true, data: {} });
    },
  });

  const invalidImage = await api.createService(validForm({ image: "https://example.com/x.png" }));
  const invalidId = await api.updateService("bad-id", validForm());
  const invalidDelete = await api.deleteService("bad-id");
  const invalidQuery = await api.listOwnedServices({ page: 0 });

  for (const result of [invalidImage, invalidId, invalidDelete, invalidQuery]) {
    assert.equal(result.ok, false);
  }
  assert.equal(calls, 0);
});

test("service API client preserves structured errors and network failures", async () => {
  const conflictApi = createServiceManagementApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () =>
      jsonResponse(
        { success: false, error: { code: "CONFLICT", message: "Booking reference exists." } },
        409,
      ),
  });
  const offlineApi = createServiceManagementApiClient({
    getAccessToken: async () => "token",
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });

  const conflict = await conflictApi.deleteService(SERVICE_ID);
  const offline = await offlineApi.listOwnedServices();

  assert.deepEqual(conflict, {
    ok: false,
    status: 409,
    code: "CONFLICT",
    message: "Booking reference exists.",
  });
  assert.deepEqual(offline, {
    ok: false,
    status: 0,
    code: "CLIENT_REQUEST_FAILED",
    message: "The service request could not be sent.",
  });
});
