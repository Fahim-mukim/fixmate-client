import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { APPROVAL_STATUS_LABELS } from "../src/lib/service-management-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("dashboard stat cards and charts use shared components with empty states", () => {
  const statCard = source("src/components/dashboard/stat-card.jsx");
  const chart = source("src/components/dashboard/dashboard-chart.jsx");
  const customer = source("src/components/dashboard/customer-bookings-panel.jsx");
  const technician = source("src/components/dashboard/technician-requests-panel.jsx");
  const admin = source("src/components/dashboard/admin-dashboard-stats.jsx");

  assert.match(statCard, /StatCardSkeleton/);
  assert.match(chart, /No data to chart yet/);
  assert.match(chart, /aria-label=\{title\}/);
  assert.match(chart, /sr-only/);
  assert.match(customer, /DashboardBarChart/);
  assert.match(customer, /No booking requests yet/);
  assert.match(technician, /DashboardBarChart/);
  assert.match(technician, /No technician statistics yet/);
  assert.match(admin, /DashboardBarChart/);
  assert.match(admin, /No platform statistics yet/);
});

test("dashboard stats are fetched from authoritative server endpoints", () => {
  const bookingApi = source("src/lib/booking-api-client.js");
  const serviceApi = source("src/lib/service-management-api-client.js");
  const adminApi = source("src/lib/admin-user-api-client.js");
  const customer = source("src/components/dashboard/customer-bookings-panel.jsx");
  const technician = source("src/components/dashboard/technician-requests-panel.jsx");
  const admin = source("src/components/dashboard/admin-dashboard-stats.jsx");

  assert.match(bookingApi, /getMyBookingStats/);
  assert.match(bookingApi, /\["mine", "stats"\]/);
  assert.match(bookingApi, /getTechnicianBookingStats/);
  assert.match(bookingApi, /\["technician", "stats"\]/);
  assert.match(serviceApi, /getMyServiceStats/);
  assert.match(adminApi, /getAdminStats/);
  assert.match(customer, /bookingApi\.getMyBookingStats\(\)/);
  assert.match(technician, /bookingApi\.getTechnicianBookingStats\(\)/);
  assert.match(technician, /serviceManagementApi\.getMyServiceStats\(\)/);
  assert.match(admin, /adminUserApi\.getAdminStats\(\)/);
});

test("status badges use consistent labels for approval statuses", () => {
  assert.deepEqual(APPROVAL_STATUS_LABELS, {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  });
  const admin = source("src/components/dashboard/admin-services-panel.jsx");
  const tech = source("src/components/dashboard/technician-services-panel.jsx");
  assert.match(admin, /APPROVAL_STATUS_LABELS/);
  assert.match(tech, /APPROVAL_STATUS_LABELS/);
});

test("destructive actions use confirmation dialogs and do not mutate before confirm", () => {
  const customer = source("src/components/dashboard/customer-bookings-panel.jsx");
  const techReq = source("src/components/dashboard/technician-requests-panel.jsx");
  const techSvc = source("src/components/dashboard/technician-services-panel.jsx");
  const admin = source("src/components/dashboard/admin-services-panel.jsx");

  for (const panel of [customer, techReq, techSvc, admin]) {
    assert.match(panel, /AlertDialog/);
  }
  assert.match(customer, /handleCancel\(booking\._id\)/);
  assert.match(customer, /event\.preventDefault\(\)/);
  assert.match(techReq, /runAction\(booking\._id, "reject"\)/);
  assert.match(techReq, /event\.preventDefault\(\)/);
  assert.match(techSvc, /handleDelete\(\)/);
  assert.match(techSvc, /event\.preventDefault\(\)/);
  assert.match(admin, /handleDecision\(\)/);
  assert.match(admin, /event\.preventDefault\(\)/);
});

test("mutation actions show toasts on success and failure and prevent duplicate submits", () => {
  const signIn = source("src/components/auth/sign-in-form.jsx");
  const signUp = source("src/components/auth/sign-up-form.jsx");
  const profile = source("src/components/dashboard/profile-panel.jsx");
  const upload = source("src/components/dashboard/image-upload-field.jsx");
  const serviceForm = source("src/components/dashboard/service-form.jsx");
  const techSvc = source("src/components/dashboard/technician-services-panel.jsx");
  const adminSvc = source("src/components/dashboard/admin-services-panel.jsx");
  const adminUsers = source("src/components/dashboard/admin-users-panel.jsx");
  const bookingReq = source("src/components/bookings/booking-request-panel.jsx");
  const payNow = source("src/components/dashboard/customer-pay-now-button.jsx");

  for (const file of [signIn, signUp, profile, upload, serviceForm, techSvc, adminSvc, adminUsers, bookingReq, payNow]) {
    assert.match(file, /toast\.add\(/);
  }
  assert.match(techSvc, /deletingRef\.current/);
  assert.match(adminSvc, /decisionRef\.current/);
  assert.match(adminUsers, /updatingRoleRef\.current/);
  assert.match(serviceForm, /submittingRef\.current/);
  assert.match(payNow, /submissionGuard\.current\.begin\(\)/);

  // failure handling
  assert.match(serviceForm, /Service creation failed|Service update failed/);
  assert.match(profile, /Profile update failed/);
  assert.match(payNow, /Checkout failed/);
});
