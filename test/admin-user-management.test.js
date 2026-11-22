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

test("admin users route is role-gated and linked only in the admin dashboard", () => {
  const page = source("src/app/dashboard/admin/users/page.js");
  const gate = source("src/components/dashboard/dashboard-gate.jsx");

  assert.match(page, /DashboardGate/);
  assert.ok(page.includes('expectedRole="admin"'));
  assert.match(page, /AdminUsersPanel/);
  assert.match(page, /Server enforces Admin authorization/);
  assert.match(gate, /state\.user\?\.role !== expectedRole/);

  const adminHrefs = dashboardLinksForRole("admin").map((link) => link.href);
  assert.ok(adminHrefs.includes("/dashboard/admin/users"));
  for (const role of ["customer", "technician"]) {
    const links = dashboardLinksForRole(role).map((link) => link.href);
    assert.ok(!links.includes("/dashboard/admin/users"));
  }
});

test("admin panel displays only safe server-backed user fields", () => {
  const panel = source("src/components/dashboard/admin-users-panel.jsx");

  for (const field of [
    "user?.image",
    "user.name",
    "user.email",
    "user.role",
    "user.phone",
    "user.area",
    "user.createdAt",
  ]) {
    assert.ok(panel.includes(field), `${field} is not displayed`);
  }

  for (const secret of [
    "passwordHash",
    "sessionToken",
    "verificationToken",
    "authUserId",
  ]) {
    assert.ok(!panel.includes(secret), `${secret} must not be displayed`);
  }
});

test("admin panel provides filters, search, responsive states, and pagination", () => {
  const panel = source("src/components/dashboard/admin-users-panel.jsx");

  assert.match(panel, /USER_ROLE_FILTERS\.map/);
  assert.match(panel, /type="search"/);
  assert.match(panel, /handleSearchSubmit/);
  assert.match(panel, /<table/);
  assert.match(panel, /hidden .*md:block/);
  assert.match(panel, /grid gap-4 md:hidden/);
  assert.match(panel, /dark:bg-surface-alt/);
  assert.match(panel, /aria-label="Loading users"/);
  assert.match(panel, /No users found/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Try again/);
  assert.match(panel, /label="Admin user pages"/);
  assert.match(panel, /adminUserErrorMessage\(error/);
});

test("admin panel requires server detail inspection and exposes no mutations", () => {
  const panel = source("src/components/dashboard/admin-users-panel.jsx");

  assert.match(panel, /openDetail\(user\)/);
  assert.match(panel, /adminUserApi\.getAdminUser\(user\.id\)/);
  assert.match(panel, /aria-label="Loading user details"/);
  assert.match(panel, /detailIsCurrent/);
  assert.match(panel, /This view is read-only/);
  assert.ok(!/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/.test(panel));
  assert.ok(!panel.includes("setUserRole"));
  assert.ok(!panel.includes("deleteUser"));
  assert.ok(!panel.includes("suspendUser"));
  assert.ok(!panel.includes("setUserStatus"));
});

test("admin user BFF is Bearer-only and never forwards cookies", () => {
  const proxy = source("src/lib/admin-user-proxy.js");
  const route = source("src/app/api/fixmate/admin-users/[[...segments]]/route.js");

  assert.match(proxy, /extractBearerToken\(authorization\)/);
  assert.match(proxy, /\[AUTHORIZATION_HEADER\]: `Bearer \$\{token\}`/);
  assert.ok(!proxy.includes("cookie"));
  assert.match(route, /connection\(\)/);
  assert.match(route, /request\.headers\.get\(AUTHORIZATION_HEADER\)/);
});

test("admin user source adds no browser-visible secret or direct upload path", () => {
  const files = [
    "src/app/dashboard/admin/users/page.js",
    "src/components/dashboard/admin-users-panel.jsx",
    "src/lib/admin-user-contract.js",
    "src/lib/admin-user-proxy.js",
    "src/lib/admin-user-api-client.js",
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
