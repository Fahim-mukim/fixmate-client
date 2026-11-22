import test from "node:test";
import assert from "node:assert/strict";

import {
  APPROVAL_STATUSES,
  SERVICE_MANAGEMENT_PROXY_PATH,
  SERVICE_UPSTREAM_PATH,
  SERVICE_WRITE_FIELDS,
  buildOwnedServiceQuery,
  buildServiceWriteBody,
  safeServiceImageUrl,
  serviceErrorMessage,
  serviceFormFromService,
  validateServiceForm,
} from "../src/lib/service-management-contract.js";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
} from "../src/lib/service-utils.js";

const IMAGE_URL = "https://i.imgbb.com/repair-service.png";

function validForm(overrides = {}) {
  return {
    title: "  Screen replacement  ",
    category: "Smartphone",
    description: "  Repair a cracked display with a calibrated replacement panel.  ",
    image: IMAGE_URL,
    basePrice: "149.50",
    estimatedDuration: " 45 minutes ",
    serviceMode: "Shop Drop-off",
    serviceArea: " Dhaka ",
    isAvailable: true,
    ...overrides,
  };
}

test("service management paths and write allowlist mirror the server contract", () => {
  assert.equal(SERVICE_MANAGEMENT_PROXY_PATH, "/api/fixmate/services");
  assert.equal(SERVICE_UPSTREAM_PATH, "/api/services");
  assert.deepEqual([...SERVICE_WRITE_FIELDS], [
    "title",
    "category",
    "description",
    "image",
    "basePrice",
    "estimatedDuration",
    "serviceMode",
    "serviceArea",
    "isAvailable",
  ]);
  assert.deepEqual([...SERVICE_CATEGORIES], [
    "Smartphone",
    "Laptop & PC",
    "AC",
    "Refrigerator",
    "TV",
    "Washing Machine",
    "Electrical",
  ]);
  assert.deepEqual([...SERVICE_MODES], ["Home Visit", "Shop Drop-off"]);
  assert.deepEqual([...APPROVAL_STATUSES], ["pending", "approved", "rejected"]);
});

test("service form validation accepts only server-compatible values", () => {
  assert.deepEqual(validateServiceForm(validForm()), {});

  const invalid = validateServiceForm(
    validForm({
      title: "x",
      category: "Unknown",
      description: "short",
      image: "https://example.com/not-hosted.png",
      basePrice: "-5",
      estimatedDuration: "",
      serviceMode: "Mail-in",
      serviceArea: "",
      isAvailable: "yes",
    }),
  );

  for (const field of [
    "title",
    "category",
    "description",
    "image",
    "basePrice",
    "estimatedDuration",
    "serviceMode",
    "serviceArea",
    "isAvailable",
  ]) {
    assert.ok(invalid[field], `${field} should be rejected`);
  }
});

test("service write body trims input and excludes identity and approval fields", () => {
  const body = buildServiceWriteBody({
    ...validForm(),
    technicianId: "spoof-owner",
    approvalStatus: "approved",
    _id: "spoof-id",
  });

  assert.deepEqual(Object.keys(body).sort(), [...SERVICE_WRITE_FIELDS].sort());
  assert.equal(body.title, "Screen replacement");
  assert.equal(body.description, "Repair a cracked display with a calibrated replacement panel.");
  assert.equal(body.basePrice, 149.5);
  assert.equal(body.estimatedDuration, "45 minutes");
  assert.equal(body.serviceArea, "Dhaka");
  assert.equal(body.isAvailable, true);
  assert.equal(body.technicianId, undefined);
  assert.equal(body.approvalStatus, undefined);
  assert.throws(() => buildServiceWriteBody(validForm({ basePrice: "0" })));
});

test("service edit form preserves current values and rejects untrusted image hosts", () => {
  const current = {
    _id: "507f1f77bcf86cd799439012",
    title: "Existing service",
    category: "AC",
    description: "Diagnose and repair a cooling fault at the customer location.",
    image: IMAGE_URL,
    basePrice: 75,
    estimatedDuration: "1 hour",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur",
    isAvailable: false,
    approvalStatus: "approved",
    technicianId: "owner",
  };

  assert.deepEqual(serviceFormFromService(current), {
    title: "Existing service",
    category: "AC",
    description: "Diagnose and repair a cooling fault at the customer location.",
    image: IMAGE_URL,
    basePrice: "75",
    estimatedDuration: "1 hour",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur",
    isAvailable: false,
  });

  assert.equal(safeServiceImageUrl("http://i.imgbb.com/insecure.png"), null);
  assert.equal(safeServiceImageUrl("https://evil.example/i.imgbb.com/x.png"), null);
  assert.equal(
    safeServiceImageUrl("https://i.imgbb.com/hosted.png"),
    "https://i.imgbb.com/hosted.png",
  );
  assert.equal(
    serviceFormFromService({ ...current, image: "https://example.com/x.png" }).image,
    "",
  );
});

test("owned service query builder accepts only page and limit inside server bounds", () => {
  assert.deepEqual(buildOwnedServiceQuery(), {
    ok: true,
    query: "page=1&limit=12",
    page: 1,
    limit: 12,
  });
  assert.deepEqual(buildOwnedServiceQuery({ page: 3, limit: 50 }).query, "page=3&limit=50");
  assert.equal(buildOwnedServiceQuery({ page: 0 }).ok, false);
  assert.equal(buildOwnedServiceQuery({ limit: 51 }).ok, false);
  assert.equal(buildOwnedServiceQuery({ page: "2" }).ok, false);
});

test("service error copy explains booking conflicts and expired sessions", () => {
  assert.equal(
    serviceErrorMessage({ ok: false, code: "CONFLICT", status: 409 }),
    "This service is referenced by a booking and cannot be deleted.",
  );
  assert.match(
    serviceErrorMessage({ ok: false, status: 401 }),
    /session has expired/i,
  );
  assert.match(serviceErrorMessage({ ok: false, status: 404 }), /no longer exists/i);
  assert.equal(serviceErrorMessage({ ok: false, message: "Server said no." }), "Server said no.");
});
