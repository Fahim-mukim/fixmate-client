import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { dashboardLinksForRole } from "../src/lib/dashboard-navigation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("profile route is a shared protected dashboard page for all roles", () => {
  const page = source("src/app/dashboard/profile/page.js");

  assert.match(page, /DashboardGate/);
  assert.match(page, /allowAnyRole/);
  assert.match(page, /ProfilePanel/);
  assert.ok(!page.includes('expectedRole="'), "profile must not be limited to one role");
});

test("shared dashboard navigation includes one profile entry for every role", () => {
  for (const role of ["customer", "technician", "admin"]) {
    const links = dashboardLinksForRole(role);
    const profileLinks = links.filter((link) => link.href === "/dashboard/profile");

    assert.equal(profileLinks.length, 1, `${role} needs exactly one profile link`);
    assert.equal(profileLinks[0].label, "Profile");
  }
});

test("dashboard gate supports shared routes and refreshes the canonical user", () => {
  const gate = source("src/components/dashboard/dashboard-gate.jsx");

  assert.match(gate, /allowAnyRole\s*=\s*false/);
  assert.match(gate, /!allowAnyRole && state\.user\?\.role !== expectedRole/);
  assert.match(gate, /DashboardUserRefreshContext/);
  assert.match(gate, /useDashboardUserRefresh/);
  assert.match(gate, /refreshUser/);
  assert.match(gate, /getCurrentApplicationUser/);
  assert.match(gate, /role=\{allowAnyRole \? state\.user\.role : expectedRole\}/);
});

test("profile panel renders editable fields and read-only email and role", () => {
  const panel = source("src/components/dashboard/profile-panel.jsx");

  for (const field of ["name", "phone", "area", "bio"]) {
    assert.ok(panel.includes(`id="profile-${field}"`), `${field} editor is missing`);
    assert.match(panel, new RegExp(`handleChange\\("${field}"`));
  }
  for (const field of ["email", "role"]) {
    assert.ok(panel.includes(`id="profile-${field}"`), `${field} display is missing`);
    assert.match(panel, new RegExp(`id="profile-${field}"[\\s\\S]{0,180}readOnly`));
    assert.ok(!panel.includes(`name="${field}"`), `${field} must not be submitted`);
  }
  assert.match(panel, /safeProfileImageUrl\(state\.profile\.image\)/);
  assert.match(panel, /No profile image/);
  assert.match(panel, /profileApi\.getProfile\(\)/);
  assert.match(panel, /profileApi\.updateProfile/);
  assert.match(panel, /validateProfileInput/);
  assert.match(panel, /buildProfileUpdateBody/);
  assert.match(panel, /refreshUser\(\)/);
});

test("profile panel shows loading, saving, success, error, and duplicate-submit states", () => {
  const panel = source("src/components/dashboard/profile-panel.jsx");

  assert.match(panel, /ProfileSkeleton/);
  assert.match(panel, /savingRef\.current/);
  assert.match(panel, /if \(savingRef\.current \|\| !state\.profile\) return/);
  assert.match(panel, /aria-busy=\{saving\}/);
  assert.match(panel, /Saving…/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Profile updated\./);
  assert.match(panel, /Try again/);
});

test("profile image boundary keeps upload credentials out of the browser", () => {
  const files = [
    "src/components/dashboard/profile-panel.jsx",
    "src/lib/profile-contract.js",
    "src/lib/profile-api-client.js",
    "src/lib/profile-proxy.js",
  ];

  for (const file of files) {
    const contents = source(file);
    assert.ok(!contents.includes("NEXT_PUBLIC_"), `${file} must not expose private config`);
    assert.ok(!/imgbb\s*key/i.test(contents), `${file} must not contain an upload key`);
  }

  const panel = source("src/components/dashboard/profile-panel.jsx");
  assert.match(panel, /Profile photo upload is not available yet/);
});

test("profile BFF route forwards only GET and PATCH through the safe proxy", () => {
  const route = source("src/app/api/fixmate/profile/route.js");
  const proxy = source("src/lib/profile-proxy.js");

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /createProfileProxyHandler/);
  assert.match(route, /request\.headers\.get\(AUTHORIZATION_HEADER\)/);
  assert.match(proxy, /extractBearerToken\(authorization\)/);
  assert.match(proxy, /PROXY_METHODS/);
  assert.ok(!proxy.includes("headers.get(\"cookie\")"));
});
