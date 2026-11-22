import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { dashboardLinksForRole } from "../src/lib/dashboard-navigation.js";
import {
  MODERATION_FILTERS,
  moderationActionsForStatus,
} from "../src/lib/service-management-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const DIRECT_IMGBB_UPLOAD_PATH = ["api.imgbb.com", "1", "upload"].join("/");

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("admin service route is role-gated and linked only in the admin dashboard", () => {
  const page = source("src/app/dashboard/admin/services/page.js");
  const gate = source("src/components/dashboard/dashboard-gate.jsx");

  assert.match(page, /DashboardGate/);
  assert.ok(page.includes('expectedRole="admin"'));
  assert.match(page, /AdminServicesPanel/);
  assert.match(page, /Service moderation/);
  assert.match(gate, /state\.user\?\.role !== expectedRole/);
  assert.match(gate, /This dashboard isn’t for your role/);

  const adminHrefs = dashboardLinksForRole("admin").map((link) => link.href);
  assert.ok(adminHrefs.includes("/dashboard/admin/services"));
  for (const role of ["customer", "technician"]) {
    const links = dashboardLinksForRole(role).map((link) => link.href);
    assert.ok(!links.includes("/dashboard/admin/services"));
  }
});

test("admin panel shows server-backed fields, filters, responsive states, and pagination", () => {
  const panel = source("src/components/dashboard/admin-services-panel.jsx");

  assert.match(panel, /MODERATION_FILTERS\.map/);
  assert.deepEqual(
    MODERATION_FILTERS.map((filter) => filter.label),
    ["Pending", "Approved", "Rejected", "All"],
  );
  assert.ok(!panel.includes('type="search"'));
  assert.ok(!panel.includes("Search services"));

  for (const field of [
    "service.image",
    "service.title",
    "service.category",
    "service.technicianName",
    "service.technicianEmail",
    "service.basePrice",
    "service.serviceMode",
    "service.serviceArea",
    "service.approvalStatus",
    "service.isAvailable",
    "service.createdAt",
  ]) {
    assert.ok(panel.includes(field), `${field} is not displayed`);
  }

  assert.match(panel, /<ServiceImage/);
  assert.match(panel, /formatPrice\(service\.basePrice\)/);
  assert.match(panel, /formatServiceCreatedAt\(service\.createdAt\)/);
  assert.match(panel, /<table/);
  assert.match(panel, /hidden .*md:block/);
  assert.match(panel, /grid gap-4 md:hidden/);
  assert.match(panel, /dark:bg-surface-alt/);
  assert.match(panel, /aria-label="Loading services for moderation"/);
  assert.match(panel, /No services to moderate/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Try again/);
  assert.match(panel, /label="Moderation pages"/);
  assert.match(panel, /moderationErrorMessage\(error/);
});

test("admin panel requires full detail review before showing allowed decisions", () => {
  const panel = source("src/components/dashboard/admin-services-panel.jsx");

  assert.match(panel, /openDetail\(service\)/);
  assert.match(panel, /serviceManagementApi\.getModerationService\(service\._id\)/);
  assert.match(panel, /aria-label="Loading service details"/);
  assert.match(panel, /detailIsCurrent/);
  assert.match(panel, /!detailLoading &&\s*!detailError/);
  assert.match(panel, /moderationActionsForStatus\(detail\.approvalStatus\)/);
  assert.match(panel, /actions\.map\(\(action\)/);
  assert.match(panel, /beginDecision\(action\)/);
  assert.match(panel, /role="alertdialog"/);
  assert.match(panel, /Yes, approve service/);
  assert.match(panel, /Yes, reject service/);
  assert.ok(!panel.includes("serviceManagementApi.updateService"));
  assert.ok(!panel.includes("approvalStatus:"));

  assert.deepEqual(moderationActionsForStatus("pending"), ["approve", "reject"]);
  assert.deepEqual(moderationActionsForStatus("rejected"), ["approve"]);
  assert.deepEqual(moderationActionsForStatus("approved"), ["reject"]);
});

test("admin decisions confirm, block duplicate submits, and refresh server status", () => {
  const panel = source("src/components/dashboard/admin-services-panel.jsx");

  assert.match(panel, /decisionRef\.current/);
  assert.match(panel, /if \(\s*!decision \|\|\s*decisionRef\.current/);
  assert.match(panel, /serviceManagementApi\.setModerationStatus\(serviceId, action\)/);
  assert.match(panel, /aria-busy=\{Boolean\(submittingAction\)\}/);
  assert.match(panel, /disabled=\{Boolean\(submittingAction\)\}/);
  assert.ok(
    !/setData\(\(current\) => current\.items\.map/.test(panel),
    "the UI must not mutate local approval status before the server confirms it",
  );
  assert.match(panel, /Service approved\./);
  assert.match(panel, /Service rejected\./);
  assert.match(panel, /closeDetail\(\);/);
  assert.match(panel, /setPage\(1\);/);
  assert.match(panel, /setReloadToken\(\(value\) => value \+ 1\)/);
  assert.match(panel, /\[load, page, statusFilter, reloadToken\]/);
});

test("admin moderation source adds no browser-visible secret or direct upload path", () => {
  const files = [
    "src/app/dashboard/admin/services/page.js",
    "src/components/dashboard/admin-services-panel.jsx",
    "src/lib/service-management-contract.js",
    "src/lib/service-management-proxy.js",
    "src/lib/service-management-api-client.js",
  ];

  for (const file of files) {
    const contents = source(file);
    assert.ok(!contents.includes("NEXT_PUBLIC_"), `${file} must not expose private config`);
    assert.ok(!/imgbb\s*key/i.test(contents), `${file} must not contain an upload key`);
    assert.ok(
      !contents.includes(DIRECT_IMGBB_UPLOAD_PATH),
      `${file} must not call ImgBB directly`,
    );
  }
});
