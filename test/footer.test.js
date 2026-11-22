import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = (p) => readFileSync(join(root, p), "utf8");

test("footer uses approved logo, organized nav, and real service category links", () => {
  const footer = source("src/components/layout/site-footer.jsx");

  assert.match(footer, /FixMateLogo/);
  assert.match(footer, /Footer explore navigation/);
  assert.match(footer, /Footer service category navigation/);
  assert.match(footer, /Footer account navigation/);
  assert.match(footer, /SERVICE_CATEGORIES/);
  assert.match(footer, /buildServicesHref\(\{ category \}\)/);
  assert.match(footer, /href="\/sign-up"/);
  assert.match(footer, /href="\/dashboard"/);
  assert.ok(!footer.includes("tel:"), "footer must not invent phone numbers");
  assert.ok(!footer.includes("mailto:"), "footer must not invent email addresses");
});
