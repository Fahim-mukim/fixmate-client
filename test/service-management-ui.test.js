import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { dashboardLinksForRole } from "../src/lib/dashboard-navigation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const DIRECT_IMGBB_UPLOAD_PATH = ["api.imgbb.com", "1", "upload"].join("/");

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("technician service routes are role-gated and linked only in the technician dashboard", () => {
  const addPage = source("src/app/dashboard/technician/add-service/page.js");
  const myPage = source("src/app/dashboard/technician/my-services/page.js");

  for (const [page, component] of [
    [addPage, "ServiceForm"],
    [myPage, "TechnicianServicesPanel"],
  ]) {
    assert.match(page, /DashboardGate/);
    assert.ok(page.includes('expectedRole="technician"'));
    assert.ok(page.includes(component));
  }

  const technicianLinks = dashboardLinksForRole("technician").map((link) => link.href);
  assert.ok(technicianLinks.includes("/dashboard/technician/my-services"));
  assert.ok(technicianLinks.includes("/dashboard/technician/add-service"));
  for (const role of ["customer", "admin"]) {
    const links = dashboardLinksForRole(role).map((link) => link.href);
    assert.ok(!links.includes("/dashboard/technician/my-services"));
    assert.ok(!links.includes("/dashboard/technician/add-service"));
  }
});

test("service BFF route exposes only mapped methods through the safe proxy", () => {
  const route = source("src/app/api/fixmate/services/[[...segments]]/route.js");
  const proxy = source("src/lib/service-management-proxy.js");

  assert.match(route, /connection\(\)/);
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.ok(route.includes(`export async function ${method}`));
  }
  assert.ok(!route.includes("export async function PUT"));
  assert.match(route, /createServiceManagementProxyHandler/);
  assert.match(route, /request\.headers\.get\(AUTHORIZATION_HEADER\)/);
  assert.match(proxy, /extractBearerToken\(authorization\)/);
  assert.match(proxy, /ALLOWED_QUERY_KEYS = new Set\(\["page", "limit"\]\)/);
  assert.ok(!proxy.includes("headers.get(\"cookie\")"));
  assert.ok(!route.includes("headers.get(\"cookie\")"));
});

test("service form exposes all required fields and uses the trusted two-step image flow", () => {
  const form = source("src/components/dashboard/service-form.jsx");
  const field = source("src/components/dashboard/image-upload-field.jsx");

  for (const id of [
    "service-title",
    "service-category",
    "service-description",
    "service-base-price",
    "service-estimated-duration",
    "service-mode",
    "service-area",
    "service-availability",
  ]) {
    assert.ok(form.includes(`id="${id}"`), `${id} field is missing`);
  }

  assert.match(form, /SERVICE_CATEGORIES\.map/);
  assert.match(form, /SERVICE_MODES\.map/);
  assert.match(form, /Base price \(USD\)/);
  assert.match(form, /purpose="service"/);
  assert.match(form, /inputId="service-image"/);
  assert.match(form, /onUploaded=\{handleImageUploaded\}/);
  assert.match(form, /safeServiceImageUrl\(data\?\.imageUrl\)/);
  assert.match(form, /validateServiceForm\(form\)/);
  assert.match(form, /serviceManagementApi\.createService\(form\)/);
  assert.match(field, /uploadApi\.uploadImage\(purpose, file\)/);
  assert.match(field, /URL\.createObjectURL\(selected\)/);
  assert.match(field, /Uploading…/);
  assert.match(field, /Retry upload/);
  assert.match(field, /role=\{status === "error" \? "alert"/);
  assert.ok(!form.includes("technicianId"));
  assert.ok(!form.includes("approvalStatus"));
});

test("service form prevents duplicate submission and explains create and edit outcomes", () => {
  const form = source("src/components/dashboard/service-form.jsx");

  assert.match(form, /submittingRef\.current/);
  assert.match(form, /if \(submittingRef\.current\) return/);
  assert.match(form, /aria-busy=\{saving\}/);
  assert.match(form, /disabled=\{saving\}/);
  assert.match(form, /Service submitted for approval\./);
  assert.match(form, /serviceManagementApi\.updateService\(initialService\?\._id, form\)/);
  assert.match(form, /Service updated and returned to pending approval\./);
  assert.match(form, /Editing a service resets its approval status to pending/);
  assert.match(form, /not be\s+publicly visible until an Admin approves it again/);
});

test("my services panel renders loading, empty, error, list, and pagination states", () => {
  const panel = source("src/components/dashboard/technician-services-panel.jsx");

  assert.match(panel, /ServiceSkeleton/);
  assert.match(panel, /aria-label="Loading services"/);
  assert.match(panel, /No services yet/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Try again/);
  assert.match(panel, /serviceManagementApi\.listOwnedServices/);
  assert.match(panel, /data\.items\.map/);
  assert.match(panel, /<ServiceImage/);
  assert.match(panel, /formatPrice\(service\.basePrice\)/);
  assert.match(panel, /service\.category/);
  assert.match(panel, /service\.serviceMode/);
  assert.match(panel, /service\.approvalStatus/);
  assert.match(panel, /service\.isAvailable/);
  assert.match(panel, /label="Service pages"/);
});

test("edit uses the shared form with current data and reports reapproval after success", () => {
  const panel = source("src/components/dashboard/technician-services-panel.jsx");
  const form = source("src/components/dashboard/service-form.jsx");
  const contract = source("src/lib/service-management-contract.js");

  assert.match(panel, /mode="edit"/);
  assert.match(panel, /initialService=\{editingService\}/);
  assert.match(panel, /setEditingService\(service\)/);
  assert.match(panel, /Service updated and sent for re-approval\./);
  assert.match(panel, /await load\(page\)/);
  assert.match(form, /serviceFormFromService\(initialService\)/);
  assert.match(contract, /image: safeServiceImageUrl\(source\.image\) \?\? ""/);
  assert.match(contract, /isAvailable:\s*typeof source\.isAvailable === "boolean" \? source\.isAvailable : true/);
});

test("delete requires confirmation, waits for server success, and explains conflicts", () => {
  const panel = source("src/components/dashboard/technician-services-panel.jsx");
  const contract = source("src/lib/service-management-contract.js");

  assert.match(panel, /setDeleteCandidate\(service\)/);
  assert.match(panel, /role="alertdialog"/);
  assert.match(panel, /Yes, delete service/);
  assert.match(panel, /if \(deletingRef\.current \|\| !deleteCandidate\?\._id\) return/);
  assert.match(panel, /const result = await serviceManagementApi\.deleteService\(deleteCandidate\._id\)/);
  assert.match(panel, /if \(result\.ok\) \{/);
  assert.match(panel, /setNotice\("Service deleted\."\)/);
  assert.match(panel, /The service stays listed until the\s+server confirms deletion\./);
  assert.ok(
    !/setData\(\(current\) => current\.items\.filter/.test(panel),
    "the UI must not remove a service before the server confirms deletion",
  );
  assert.match(contract, /if \(result\.code === "CONFLICT"\)/);
  assert.match(
    contract,
    /This service is referenced by a booking and cannot be deleted\./,
  );
});

test("generalized upload field preserves the unchanged profile upload behavior", () => {
  const field = source("src/components/dashboard/image-upload-field.jsx");
  const profile = source("src/components/dashboard/profile-panel.jsx");

  assert.match(field, /purpose = "profile"/);
  assert.match(field, /label = "Profile photo"/);
  assert.match(field, /emptyLabel = "No photo"/);
  assert.match(field, /successMessage = "Photo uploaded\."/);
  assert.match(field, /validateUrl = safeProfileImageUrl/);
  assert.match(field, /resolvedInputId = inputId \?\? `\$\{purpose\}-photo-input`/);
  assert.match(profile, /purpose="profile"/);
  assert.match(profile, /currentImageUrl=\{state\.profile\.image\}/);
  assert.match(profile, /Profile photo updated\./);
});

test("service management keeps upload credentials and client identity out of the browser boundary", () => {
  const files = [
    "src/app/dashboard/technician/add-service/page.js",
    "src/app/dashboard/technician/my-services/page.js",
    "src/app/api/fixmate/services/[[...segments]]/route.js",
    "src/lib/service-management-contract.js",
    "src/lib/service-management-proxy.js",
    "src/lib/service-management-api-client.js",
    "src/components/dashboard/service-form.jsx",
    "src/components/dashboard/technician-services-panel.jsx",
    "src/components/dashboard/image-upload-field.jsx",
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
