import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BOOKING_CREATE_FIELDS,
  bookingErrorMessage,
  bookingPaymentLabel,
  bookingReference,
  bookingStatusClass,
  bookingViewState,
  buildBookingCreateBody,
  buildBookingListQuery,
  buildTransitionBody,
  canCustomerCancel,
  canShowBookingForm,
  createSubmissionGuard,
  dashboardHrefForRole,
  formatBookingAmount,
  formatBookingDate,
  getAdminActions,
  getBookingFormVisibility,
  getTechnicianActions,
  isValidBookingId,
  parsePositiveAmount,
  summarizeBookings,
  validateBookingCreateInput,
} from "../src/lib/booking-contract.js";

const futureDate = (() => {
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
})();

const validInput = {
  serviceId: "507f1f77bcf86cd799439011",
  customerPhone: "+1 (555) 123-4567",
  address: "24 Repair Lane, Springfield",
  preferredDate: futureDate,
  problemDescription: "The screen is cracked and the touch input is unreliable.",
};

test("booking create body contains only the five owner-directed fields", () => {
  const body = buildBookingCreateBody({
    ...validInput,
    customerId: "spoofed-customer",
    technicianId: "spoofed-technician",
    serviceTitle: "Spoofed title",
    status: "completed",
    paymentStatus: "paid",
    finalAmount: 1,
  });

  assert.deepEqual(Object.keys(body), [...BOOKING_CREATE_FIELDS]);
  assert.equal(body.customerPhone, validInput.customerPhone.trim());
  assert.equal(body.problemDescription, validInput.problemDescription);
});

test("booking create validation enforces description and future date rules", () => {
  const errors = validateBookingCreateInput({
    ...validInput,
    preferredDate: "2020-01-01",
    problemDescription: "short",
  });

  assert.match(errors.preferredDate, /future/i);
  assert.match(errors.problemDescription, /20/i);
});

test("final amount validation enforces owner-approved USD policy", () => {
  for (const value of [0.01, 1, 95, 95.5, "95.50", 4999.99, 5000]) {
    assert.equal(typeof parsePositiveAmount(value), "number");
  }
  assert.equal(parsePositiveAmount(95), 95);
  assert.equal(parsePositiveAmount("95.50"), 95.5);
  assert.equal(parsePositiveAmount(5000), 5000);

  for (const value of [
    0,
    -1,
    -0.01,
    5000.01,
    565743,
    95.555,
    NaN,
    Infinity,
    -Infinity,
    "1,000",
    "1e3",
    "95.555",
    "5000.01",
    "",
    " ",
    "abc",
  ]) {
    assert.equal(parsePositiveAmount(value), null, String(value));
  }

  assert.throws(
    () => buildTransitionBody("complete", "0"),
    /greater than \$0 and up to \$5,000\.00/i,
  );
  assert.throws(
    () => buildTransitionBody("complete", 565743),
    /greater than \$0 and up to \$5,000\.00/i,
  );
});

test("transition bodies follow the technician action table", () => {
  assert.deepEqual(buildTransitionBody("accept"), { status: "accepted" });
  assert.deepEqual(buildTransitionBody("reject"), { status: "rejected" });
  assert.deepEqual(buildTransitionBody("start"), { status: "in-progress" });
  assert.deepEqual(buildTransitionBody("complete", "45.75"), {
    status: "completed",
    finalAmount: 45.75,
  });
});

test("submission guard blocks duplicate in-flight submits", () => {
  const guard = createSubmissionGuard();
  assert.equal(guard.begin(), true);
  assert.equal(guard.active, true);
  assert.equal(guard.begin(), false);
  guard.finish();
  assert.equal(guard.begin(), true);
});

test("role and status helpers match the server authorization rules", () => {
  assert.equal(canShowBookingForm("customer"), true);
  assert.equal(canShowBookingForm("technician"), false);
  assert.equal(canShowBookingForm("admin"), false);
  assert.equal(canShowBookingForm(null), false);
  assert.match(getBookingFormVisibility("technician").message, /own service/i);
  assert.equal(getBookingFormVisibility(null).href, "/sign-in");
  assert.equal(dashboardHrefForRole("technician"), "/dashboard/technician");

  assert.equal(canCustomerCancel({ status: "requested" }), true);
  assert.equal(canCustomerCancel({ status: "accepted" }), false);
  assert.deepEqual([...getTechnicianActions("requested")], ["accept", "reject"]);
  assert.deepEqual([...getTechnicianActions("accepted")], ["start"]);
  assert.deepEqual([...getTechnicianActions("in-progress")], ["complete"]);
  assert.deepEqual([...getTechnicianActions("completed")], []);
  assert.deepEqual([...getAdminActions()], []);
});

test("booking query builder allows only server-supported filters", () => {
  const query = buildBookingListQuery({
    status: "requested",
    page: 2,
    limit: 500,
    customerId: "spoofed",
  });

  assert.deepEqual(query, { status: "requested", page: 2, limit: 12 });
  assert.deepEqual(buildBookingListQuery({ status: "unknown", page: 0 }), {
    limit: 12,
  });
});

test("error messages distinguish session, permission, conflict and outage cases", () => {
  assert.match(bookingErrorMessage({ status: 401 }), /session has expired/i);
  assert.match(bookingErrorMessage({ status: 403 }), /permission/i);
  assert.match(bookingErrorMessage({ status: 404 }), /no longer available/i);
  assert.equal(
    bookingErrorMessage({ status: 409, message: "Active booking exists." }),
    "Active booking exists.",
  );
  assert.match(bookingErrorMessage({ status: 503 }), /temporarily unavailable/i);
});

test("view state and summaries are derived only from supplied data", () => {
  assert.equal(bookingViewState({ loading: true }), "loading");
  assert.equal(bookingViewState({ error: "failed" }), "error");
  assert.equal(bookingViewState({ items: [] }), "empty");
  assert.equal(bookingViewState({ items: [{}] }), "ready");

  const summary = summarizeBookings([
    { status: "requested" },
    { status: "accepted" },
    { status: "completed" },
    { status: "unknown" },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.active, 2);
  assert.equal(summary.requested, 1);
  assert.equal(summary.completed, 1);
});

test("display helpers format server values without exposing internals", () => {
  assert.equal(isValidBookingId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidBookingId("activeBookingKey"), false);
  assert.equal(bookingReference("507f1f77bcf86cd799439011"), "439011");
  assert.equal(bookingPaymentLabel("unpaid"), "Unpaid");
  assert.equal(bookingPaymentLabel("paid"), "Paid");
  assert.equal(formatBookingAmount(null), "Not set");
  assert.equal(formatBookingAmount(20), "$20.00");
  assert.match(bookingStatusClass("in-progress"), /warning/);
  assert.match(formatBookingDate("2026-12-01"), /Dec 1, 2026/);
});

test("booking modules do not persist tokens in browser storage", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = [
    "src/lib/booking-contract.js",
    "src/lib/booking-api-client.js",
    "src/lib/booking-api.js",
    "src/lib/booking-proxy.js",
    "src/app/api/fixmate/bookings/[[...segments]]/route.js",
  ];

  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
  }
});
