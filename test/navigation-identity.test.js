import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { dashboardHrefForRole } from "../src/lib/booking-contract.js";
import { dashboardLinksForRole } from "../src/lib/dashboard-navigation.js";
import {
  clearSessionIdentity,
  getSessionIdentity,
  setSessionIdentity,
  subscribeSessionIdentity,
} from "../src/lib/session-identity-store.js";

const root = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function sourceFiles(directory) {
  const found = [];
  for (const entry of readdirSync(join(root, directory))) {
    const relative = join(directory, entry);
    const absolute = join(root, relative);
    if (statSync(absolute).isDirectory()) {
      found.push(...sourceFiles(relative));
    } else if (/\.(js|jsx)$/.test(entry)) {
      found.push(relative);
    }
  }
  return found;
}

test("primary navigation contains only the public links", () => {
  const links = source("src/components/layout/navigation-links.js");
  assert.match(links, /href: "\/", label: "Home"/);
  assert.match(links, /href: "\/services", label: "Services"/);
  assert.match(links, /href: "\/#how-it-works", label: "How it works"/);
  assert.ok(!links.includes("Dashboard"), "public nav must not expose a dashboard link");
  assert.ok(!links.includes("Sign in"), "sign-in is an action, not a nav item");
  assert.match(source("src/app/page.js"), /id="how-it-works"/);
});

test("header renders logged-out actions and a session-aware account menu", () => {
  const header = source("src/components/layout/site-header.jsx");
  assert.match(header, /useSession\(\)/);
  assert.match(header, /isPending/);
  assert.match(header, /loggedIn \? \(\s*<AccountMenu/);
  assert.match(header, /href="\/sign-in"/);
  assert.match(header, /href="\/sign-up"/);
  assert.match(header, /id="mobile-navigation"/);
  assert.match(header, /getCurrentApplicationUser\(\)/);
  assert.match(header, /useSessionIdentity\(\)/);
  assert.ok(!/document\.(cookie|localStorage)/.test(header), "header must not manage auth cookies or storage");
  assert.ok(!/console\.(log|debug)/.test(header), "header must not log session data");
});

test("account dropdown shows authoritative identity and safe controls", () => {
  const menu = source("src/components/layout/account-menu.jsx");
  assert.match(menu, /sessionUser/);
  assert.match(menu, /identity\?\.role/);
  assert.match(menu, /AvatarFallback/);
  assert.match(menu, /safeProfileImageUrl/);
  assert.match(menu, /dashboardHrefForRole\(role\)/);
  assert.match(menu, /Update Profile/);
  assert.match(menu, /Sign Out/);
  assert.match(menu, /signOutCurrentSession\(\)/);
  assert.match(menu, /toast\.add\(/);
  assert.ok(!/document\.cookie/.test(menu), "must not delete cookies manually");
  assert.ok(!/console\.(log|debug)/.test(menu));
});

test("dashboard links are role specific and do not grant other roles' access", () => {
  assert.equal(dashboardHrefForRole("customer"), "/dashboard/customer");
  assert.equal(dashboardHrefForRole("technician"), "/dashboard/technician");
  assert.equal(dashboardHrefForRole("admin"), "/dashboard/admin");

  for (const role of ["customer", "technician", "admin"]) {
    const links = dashboardLinksForRole(role);
    const overview = links.find((link) => link.href === dashboardHrefForRole(role));
    assert.ok(overview, `${role} must link to its own dashboard`);
    for (const other of ["customer", "technician", "admin"].filter((value) => value !== role)) {
      assert.ok(
        !links.some((link) => link.href === dashboardHrefForRole(other)),
        `${role} must not link to ${other} dashboard`,
      );
    }
    assert.ok(links.some((link) => link.href === "/dashboard/profile"), `${role} needs profile access`);
  }
});

test("dashboard gate carries a safe return URL and publishes authoritative identity", () => {
  const gate = source("src/components/dashboard/dashboard-gate.jsx");
  assert.match(gate, /signInUrlForNext\(pathname/);
  assert.match(gate, /router\.replace\(signInUrlForNext/);
  assert.match(gate, /setSessionIdentity\(user\)/);
  assert.match(gate, /<ButtonLink href=\{signInHref\}>Sign in/);
});

test("dashboard top bar reflects the shared identity and reuses sign-out", () => {
  const shell = source("src/components/dashboard/dashboard-shell.jsx");
  assert.match(shell, /useSessionIdentity\(\)/);
  assert.match(shell, /dashboard-identity-name/);
  assert.match(shell, /displayEmail/);
  assert.match(shell, /AvatarFallback/);
  assert.match(shell, /signOutCurrentSession\(\)/);
  assert.match(shell, /toast\.add\(/);
  assert.match(shell, /router\.push\("\/"\)/);
  assert.ok(!/document\.cookie/.test(shell));
  assert.ok(!/authClient\.signOut/.test(shell), "sign-out must go through the shared helper");
});

test("profile save and upload synchronize shared identity and Better Auth session", () => {
  const panel = source("src/components/dashboard/profile-panel.jsx");
  assert.match(panel, /setSessionIdentity\(displayed\)/);
  assert.match(panel, /setSessionIdentity\(nextProfile\)/);
  assert.match(panel, /refetchSession\(\)/);
  assert.match(panel, /refetch: refetchSession/);
  assert.match(panel, /aria-readonly="true"[\s\S]*Email cannot be changed here/);
  assert.match(panel, /aria-readonly="true"[\s\S]*Role is managed by FixMate/);
});

test("auth forms use the safe post-auth redirect helper", () => {
  for (const file of ["src/components/auth/sign-in-form.jsx", "src/components/auth/sign-up-form.jsx"]) {
    const form = source(file);
    assert.match(form, /resolvePostAuthPath\(search, getCurrentApplicationUser\)/);
    assert.match(form, /window\.location\.search/);
    assert.ok(!/router\.push\("\/"\)/.test(form), `${file} must not hardcode the old root redirect`);
  }
  const signUp = source("src/components/auth/sign-up-form.jsx");
  assert.match(signUp, /assertRegistrationRole\(registrationRole\)/);
  assert.match(signUp, /Admin accounts are not created through this form/);

  assert.match(source("src/app/sign-in/page.js"), /<AuthSwitchLink href="\/sign-up"/);
  assert.match(source("src/app/sign-up/page.js"), /<AuthSwitchLink href="\/sign-in"/);
  const switchLink = source("src/components/auth/auth-switch-link.jsx");
  assert.match(switchLink, /nextParamFromSearch\(window\.location\.search\)/);
  assert.match(switchLink, /safeReturnPath/);
});

test("sign-out helper uses Better Auth and clears only in-memory client state", () => {
  const helper = source("src/lib/sign-out.js");
  assert.match(helper, /await authClient\.signOut\(\)/);
  assert.match(helper, /clearAccessToken\(\)/);
  assert.match(helper, /clearSessionIdentity\(\)/);
  assert.ok(!/document\.cookie/.test(helper));
  assert.ok(!/localStorage|sessionStorage/.test(helper));
  assert.ok(!/console\.(log|debug)/.test(helper));
});

test("toast provider is mounted once in the root layout", () => {
  const layout = source("src/app/layout.js");
  assert.match(layout, /import \{ Toaster \}/);
  assert.match(layout, /<Toaster \/>/);
  const toaster = source("src/components/ui/toast.jsx");
  assert.match(toaster, /createToastManager/);
  assert.match(toaster, /ToastPrimitive\.Provider/);
});

test("there is exactly one Better Auth client factory in client source", () => {
  const factories = sourceFiles("src")
    .filter((file) => /createAuthClient\(/.test(source(file)))
    .map((file) => file.replace(/\\/g, "/"));
  assert.deepEqual(factories, ["src/lib/auth-client.js"]);
});

test("session identity store normalizes authoritative data and is hydration safe", () => {
  clearSessionIdentity();
  assert.equal(getSessionIdentity(), null);

  let notifications = 0;
  const unsubscribe = subscribeSessionIdentity(() => {
    notifications += 1;
  });

  const user = {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.test",
    image: "https://images.example.test/avatar.png",
    role: "technician",
    passwordHash: "should-not-be-copied",
    sessionToken: "should-not-be-copied",
  };
  const identity = setSessionIdentity(user);
  assert.deepEqual(identity, {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.test",
    image: "https://images.example.test/avatar.png",
    role: "technician",
  });
  assert.equal(notifications, 1);

  // Repeating the same authoritative data must not churn subscribers.
  setSessionIdentity(user);
  assert.equal(notifications, 1);

  const unsafe = setSessionIdentity({ ...user, image: "javascript:alert(1)", role: "superadmin" });
  assert.equal(unsafe.image, null);
  assert.equal(unsafe.role, "");
  assert.equal(notifications, 2);

  clearSessionIdentity();
  assert.equal(getSessionIdentity(), null);
  assert.equal(notifications, 3);

  unsubscribe();
  setSessionIdentity(user);
  assert.equal(notifications, 3);
  clearSessionIdentity();
});
