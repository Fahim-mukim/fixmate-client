import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function sourceFiles(directory) {
  const found = [];
  for (const entry of readdirSync(join(root, directory))) {
    const rel = join(directory, entry);
    const abs = join(root, rel);
    if (statSync(abs).isDirectory()) found.push(...sourceFiles(rel));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry)) found.push(rel);
  }
  return found;
}

test("AccountMenu wraps DropdownMenuLabel in DropdownMenuGroup (Base UI error #31 regression)", () => {
  const menu = source("src/components/layout/account-menu.jsx");

  assert.match(menu, /DropdownMenuGroup/, "AccountMenu must use DropdownMenuGroup");
  assert.match(menu, /DropdownMenuLabel/, "AccountMenu must render account label");

  // Base UI MenuGroupLabel requires MenuGroup or MenuRadioGroup context.
  // Ensure every DropdownMenuLabel appears inside a DropdownMenuGroup in this component.
  const groupOpens = [...menu.matchAll(/<DropdownMenuGroup[\s>]/g)].map((m) => m.index);
  const groupCloses = [...menu.matchAll(/<\/DropdownMenuGroup>/g)].map((m) => m.index);
  const labels = [...menu.matchAll(/<DropdownMenuLabel[\s>]/g)].map((m) => m.index);

  assert.ok(groupOpens.length > 0, "expected at least one DropdownMenuGroup");
  assert.ok(labels.length > 0, "expected at least one DropdownMenuLabel");

  for (const labelIndex of labels) {
    const insideGroup = groupOpens.some((open, i) => {
      const close = groupCloses[i];
      return open < labelIndex && close !== undefined && labelIndex < close;
    });
    assert.ok(insideGroup, "DropdownMenuLabel must be inside a DropdownMenuGroup");
  }
});

test("AccountMenu keeps dashboard/profile/sign-out actions", () => {
  const menu = source("src/components/layout/account-menu.jsx");
  assert.match(menu, /dashboardHrefForRole\(role\)/);
  assert.match(menu, /\/dashboard\/profile/);
  assert.match(menu, /Update Profile/);
  assert.match(menu, /Sign Out/);
  assert.match(menu, /signOutCurrentSession\(\)/);
  assert.match(menu, /useSessionIdentity|identity/, "menu should use authoritative identity props");
});

test("app DropdownMenuLabel usage is always inside a DropdownMenuGroup (static guard)", () => {
  const files = sourceFiles("src").filter((f) => !f.replace(/\\/g, "/").startsWith("src/components/ui/"));
  const offenders = [];

  for (const file of files) {
    const content = source(file);
    if (!content.includes("DropdownMenuLabel")) continue;
    const groupOpens = [...content.matchAll(/<DropdownMenuGroup[\s>]/g)].map((m) => m.index);
    const groupCloses = [...content.matchAll(/<\/DropdownMenuGroup>/g)].map((m) => m.index);
    const labels = [...content.matchAll(/<DropdownMenuLabel[\s>]/g)].map((m) => m.index);
    for (const labelIndex of labels) {
      const insideGroup = groupOpens.some((open, i) => {
        const close = groupCloses[i];
        return open < labelIndex && close !== undefined && labelIndex < close;
      });
      if (!insideGroup) offenders.push(file.replace(/\\/g, "/"));
    }
  }

  assert.deepEqual(offenders, [], `DropdownMenuLabel outside DropdownMenuGroup: ${offenders.join(", ")}`);
});
