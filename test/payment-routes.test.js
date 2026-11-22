import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

const CHECKOUT_ROUTE = "src/app/api/fixmate/payments/checkout/route.js";
const SESSION_ROUTE = "src/app/api/fixmate/payments/session/[sessionId]/route.js";
const ADMIN_ROUTE = "src/app/api/fixmate/payments/admin/route.js";
const CONTRACT = "src/lib/payment-contract.js";
const PROXY = "src/lib/payment-proxy.js";
const ROUTE_FILES = [CHECKOUT_ROUTE, SESSION_ROUTE, ADMIN_ROUTE];
const PAYMENT_FILES = [CONTRACT, PROXY, ...ROUTE_FILES];

test("payment BFF route handlers expose exactly the three intended methods", () => {
  const checkout = source(CHECKOUT_ROUTE);
  const session = source(SESSION_ROUTE);
  const admin = source(ADMIN_ROUTE);

  assert.match(checkout, /export async function POST\(request\)/);
  assert.doesNotMatch(checkout, /export async function (?:GET|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);

  assert.match(session, /export async function GET\(request, context\)/);
  assert.doesNotMatch(session, /export async function (?:POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);
  assert.match(session, /const \{ sessionId \} = await context\.params/);

  assert.match(admin, /export async function GET\(request\)/);
  assert.doesNotMatch(admin, /export async function (?:POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);
});

test("payment route handlers use the established dynamic BFF request pattern", () => {
  const checkout = source(CHECKOUT_ROUTE);
  const session = source(SESSION_ROUTE);
  const admin = source(ADMIN_ROUTE);

  for (const route of [checkout, session, admin]) {
    assert.match(route, /connection\(\)/);
    assert.match(route, /request\.headers\.get\(AUTHORIZATION_HEADER\)/);
    assert.match(route, /new URL\(request\.url\)\.searchParams/);
    assert.doesNotMatch(route, /cookies|\bnext\/headers\b|credentials|Set-Cookie/i);
  }

  assert.match(checkout, /body: await request\.text\(\)/);
  assert.match(checkout, /createCheckoutProxyHandler/);
  assert.match(session, /sessionId,/);
  assert.match(session, /createSessionProxyHandler/);
  assert.match(admin, /createAdminPaymentsProxyHandler/);
  assert.doesNotMatch(admin, /body:/);
});

test("payment proxy is Bearer-only and never reads or forwards cookies", () => {
  const proxy = source(PROXY);

  assert.match(proxy, /extractBearerToken\(authorization\)/);
  assert.match(proxy, /\[AUTHORIZATION_HEADER\]: `Bearer \$\{token\}`/);
  assert.match(proxy, /cache: "no-store"/);
  assert.doesNotMatch(proxy, /cookie/i);
  assert.doesNotMatch(proxy, /credentials/i);
  assert.doesNotMatch(proxy, /console\./);
});

test("payment BFF source adds no SDK, secret, browser config, or database writes", () => {
  for (const file of PAYMENT_FILES) {
    const contents = source(file);
    assert.doesNotMatch(contents, /NEXT_PUBLIC_/);
    assert.doesNotMatch(contents, /STRIPE_SECRET|STRIPE_WEBHOOK|process\.env\.STRIPE/);
    assert.doesNotMatch(contents, /from\s+["'](?:@)?stripe/);
    assert.doesNotMatch(contents, /mongodb|MongoClient|insertOne|updateOne|deleteOne|bulkWrite|findOneAndUpdate/i);
  }

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(packageJson.dependencies?.stripe, undefined);
  assert.equal(packageJson.devDependencies?.stripe, undefined);
  assert.equal(packageJson.dependencies?.["@stripe/stripe-js"], undefined);
});
