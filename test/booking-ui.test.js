import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildServicesHref,
  formatPrice,
  parseListingParams,
} from "../src/lib/service-utils.js";

const root = fileURLToPath(new URL("../", import.meta.url));
function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("assignment-aligned dashboard routes are present and role-gated", () => {
  const routes = [
    ["src/app/dashboard/customer/page.js", 'expectedRole="customer"'],
    ["src/app/dashboard/customer/bookings/page.js", 'expectedRole="customer"'],
    ["src/app/dashboard/customer/payments/page.js", 'expectedRole="customer"'],
    ["src/app/dashboard/technician/page.js", 'expectedRole="technician"'],
    ["src/app/dashboard/technician/requests/page.js", 'expectedRole="technician"'],
    ["src/app/dashboard/admin/page.js", 'expectedRole="admin"'],
    ["src/app/dashboard/admin/bookings/page.js", 'expectedRole="admin"'],
  ];

  for (const [file, expectedRole] of routes) {
    assert.match(source(file), /DashboardGate/);
    assert.ok(source(file).includes(expectedRole), `${file} must gate ${expectedRole}`);
  }
});

test("service detail keeps public data rendering and adds the role-aware request panel", () => {
  const detail = source("src/components/services/service-detail.jsx");

  assert.match(detail, /getPublicServiceById/);
  assert.match(detail, /ServiceImage/);
  assert.match(detail, /formatPrice/);
  assert.match(detail, /BookingRequestPanel/);

  const form = source("src/components/bookings/booking-request-panel.jsx");
  assert.match(form, /canShowBookingForm/);
  assert.match(form, /createSubmissionGuard/);
  assert.match(form, /bookingApi\.createBooking/);
  for (const field of ["customerPhone", "address", "preferredDate", "problemDescription"]) {
    assert.ok(form.includes(`name="${field}"`), `${field} input is missing`);
  }
  for (const forbidden of ['name="customerId"', 'name="technicianId"', 'name="status"']) {
    assert.ok(!form.includes(forbidden), `${forbidden} must not be submitted`);
  }
});

test("customer UI exposes cancellation only for requested bookings with confirmation", () => {
  const panel = source("src/components/dashboard/customer-bookings-panel.jsx");
  assert.match(panel, /canCustomerCancel/);
  assert.match(panel, /bookingApi\.cancelBooking/);
  assert.match(panel, /AlertDialog/);
  assert.match(panel, /<CustomerPayNowButton booking=\{booking\} role="customer" \/>/);
  assert.ok(!panel.includes("paymentApi.startCheckout"));
});

test("technician UI follows the allowed transition table and validates final amount", () => {
  const panel = source("src/components/dashboard/technician-requests-panel.jsx");
  assert.match(panel, /getTechnicianActions/);
  assert.match(panel, /parsePositiveAmount/);
  assert.match(panel, /bookingApi\.updateBookingStatus/);
  assert.match(panel, /AlertDialog/);
});

test("admin booking UI is read-only for statuses and payments", () => {
  const panel = source("src/components/dashboard/admin-bookings-panel.jsx");
  assert.match(panel, /getAdminActions/);
  assert.ok(!panel.includes("bookingApi.updateBookingStatus"));
  assert.ok(!panel.includes("bookingApi.cancelBooking"));
  assert.ok(!panel.includes("bookingApi.createBooking"));
  assert.ok(!panel.includes("Pay now"));
});

test("dashboard gate treats token and credential failures as session errors", () => {
  const gate = source("src/components/dashboard/dashboard-gate.jsx");
  assert.match(gate, /auth\|session\|sign in\|unauthor\|token\|credential/i);
});

test("theme persistence and responsive dashboard patterns remain intact", () => {
  const layout = source("src/app/layout.js");
  const toggle = source("src/components/layout/theme-toggle.jsx");
  const shell = source("src/components/dashboard/dashboard-shell.jsx");
  const customer = source("src/components/dashboard/customer-bookings-panel.jsx");

  assert.match(layout, /fixmate-theme/);
  assert.match(toggle, /fixmate-theme/);
  assert.match(shell, /lg:grid-cols-\[220px_minmax\(0,1fr\)\]/);
  assert.match(shell, /overflow-x-auto/);
  assert.match(customer, /sm:grid-cols-3/);
});

test("public marketplace helpers have no regression", () => {
  assert.equal(
    buildServicesHref({ search: "laptop", category: "Laptop & PC", page: 2 }),
    "/services?search=laptop&category=Laptop+%26+PC&page=2",
  );
  assert.equal(formatPrice(25), "$25.00");
  assert.equal(formatPrice(null), "Price not provided");
  const { params, ignored } = parseListingParams({ category: "Unknown", limit: "12" });
  assert.equal(params.category, undefined);
  assert.deepEqual(ignored, ["category"]);
  assert.equal(params.limit, 12);
});
