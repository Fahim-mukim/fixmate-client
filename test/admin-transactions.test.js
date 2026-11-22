import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMIN_PAYMENTS_PROXY_PATH,
  DEFAULT_ADMIN_PAYMENT_LIMIT,
  buildAdminPaymentQuery,
  resolveAdminPaymentQuery,
} from "../src/lib/payment-contract.js";
import { createPaymentApiClient } from "../src/lib/payment-api-client.js";
import {
  ADMIN_PAYMENT_ROW_FIELDS,
  adminPaymentErrorMessage,
  adminPaymentStatusLabel,
  adminPaymentStatusVariant,
  formatAdminPaymentAmount,
  formatAdminPaymentDate,
  hasAdminPaymentFilters,
  readAdminPaymentList,
  readAdminPaymentRow,
} from "../src/lib/admin-payment-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const PAYMENT_ID = "507f1f77bcf86cd7994390a1";
const CREATED_AT = "2026-11-22T10:00:00.000Z";

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function safeRow(overrides = {}) {
  return {
    paymentId: PAYMENT_ID,
    serviceTitle: "Screen repair",
    customerName: "A Customer",
    customerEmail: "customer@example.com",
    technicianName: "A Technician",
    amount: 95.5,
    currency: "usd",
    status: "paid",
    paidAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function safeList(overrides = {}) {
  return {
    items: [safeRow()],
    total: 1,
    page: 1,
    limit: DEFAULT_ADMIN_PAYMENT_LIMIT,
    totalPages: 1,
    ...overrides,
  };
}

test("Admin transactions page and navigation link are restricted to the admin role", () => {
  const page = source("src/app/dashboard/admin/transactions/page.js");
  assert.match(page, /expectedRole="admin"/);
  assert.match(page, /<AdminTransactionsPanel \/>/);
  assert.match(page, /title: "Admin transactions"/);

  const navigation = source("src/lib/dashboard-navigation.js");
  const adminSection = navigation.slice(navigation.indexOf("admin: Object.freeze"));
  const customerSection = navigation.slice(
    navigation.indexOf("customer: Object.freeze"),
    navigation.indexOf("technician: Object.freeze"),
  );
  const technicianSection = navigation.slice(
    navigation.indexOf("technician: Object.freeze"),
    navigation.indexOf("admin: Object.freeze"),
  );

  assert.match(
    adminSection,
    /href: "\/dashboard\/admin\/transactions", label: "Transactions"/,
  );
  assert.ok(!customerSection.includes("/dashboard/admin/transactions"));
  assert.ok(!technicianSection.includes("/dashboard/admin/transactions"));
});

test("Admin browser query accepts only allowlisted filters with safe values", () => {
  assert.equal(ADMIN_PAYMENTS_PROXY_PATH, "/api/fixmate/payments/admin");
  assert.equal(DEFAULT_ADMIN_PAYMENT_LIMIT, 10);

  const query = buildAdminPaymentQuery({
    page: 2,
    limit: 10,
    status: "paid",
    search: "  Screen  ",
    sort: "newest",
  });
  assert.equal(
    query,
    "page=2&limit=10&status=paid&search=Screen&sort=newest",
  );
  assert.equal(
    resolveAdminPaymentQuery(new URLSearchParams(query)).toString(),
    query,
  );
  assert.equal(buildAdminPaymentQuery({}), "page=1&limit=10&sort=newest");
  assert.equal(
    buildAdminPaymentQuery({ role: "admin", customerId: "spoof", amount: "1" }),
    "page=1&limit=10&sort=newest",
  );

  for (const options of [
    { page: 0 },
    { page: 100001 },
    { limit: 0 },
    { limit: 51 },
    { status: "unknown" },
    { sort: "oldest" },
    { search: "$ne" },
    { search: "x".repeat(101) },
    { search: "bad\u0000value" },
  ]) {
    assert.equal(buildAdminPaymentQuery(options), null, JSON.stringify(options));
  }
});

test("Admin payments client sends one validated GET and preserves the BFF response", async () => {
  const data = safeList({ total: 23, page: 2, limit: 10, totalPages: 3 });
  const calls = [];
  const client = createPaymentApiClient({
    authenticatedFetch: async (path, init) => {
      calls.push({ path, init });
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const result = await client.listAdminPayments({
    page: 2,
    limit: 10,
    status: "paid",
    search: "Screen",
    sort: "newest",
  });

  assert.deepEqual(result, { ok: true, data });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    `${ADMIN_PAYMENTS_PROXY_PATH}?page=2&limit=10&status=paid&search=Screen&sort=newest`,
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.headers, undefined);
});

test("Admin payments client rejects invalid filters before any request", async () => {
  let calls = 0;
  const client = createPaymentApiClient({
    authenticatedFetch: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
  });

  const result = await client.listAdminPayments({ status: "paid_but_not_real" });
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    code: "INVALID_QUERY",
    message: "The payments query is not supported.",
  });
  assert.equal(calls, 0);
});

test("Admin payment rows project only approved display fields", () => {
  const row = readAdminPaymentRow(
    safeRow({
      stripePaymentIntentId: "pi_secret_marker",
      stripeCheckoutSessionId: "cs_secret_marker",
      checkoutUrl: "https://evil.example/pay",
      amountCents: 9550,
      webhookEventId: "evt_secret_marker",
      rawDocument: { internal: true },
    }),
  );

  assert.deepEqual([...ADMIN_PAYMENT_ROW_FIELDS].sort(), Object.keys(row).sort());
  assert.equal(row.serviceTitle, "Screen repair");
  assert.equal(row.customerEmail, "customer@example.com");
  assert.equal(row.amount, 95.5);
  assert.equal(row.status, "paid");
  const serialized = JSON.stringify(row);
  for (const forbidden of [
    "pi_secret_marker",
    "cs_secret_marker",
    "https://evil.example/pay",
    "9550",
    "evt_secret_marker",
    "rawDocument",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  const sparse = readAdminPaymentRow({ paymentId: PAYMENT_ID });
  assert.equal(sparse.serviceTitle, "");
  assert.equal(sparse.customerName, "");
  assert.equal(sparse.customerEmail, "");
  assert.equal(sparse.technicianName, "");
  assert.equal(sparse.amount, null);
  assert.equal(sparse.currency, "");
  assert.equal(sparse.status, "");
  assert.equal(sparse.paidAt, null);
  assert.equal(sparse.createdAt, null);
  assert.equal(sparse.updatedAt, null);

  assert.equal(readAdminPaymentRow(null), null);
  assert.equal(readAdminPaymentRow([]), null);
  assert.equal(readAdminPaymentRow({ paymentId: "not-an-id" }), null);
  assert.equal(readAdminPaymentRow(safeRow({ status: "invented" })).status, "");
});

test("Admin payment list requires server pagination and fails closed on malformed data", () => {
  const list = readAdminPaymentList(
    safeList({ total: 23, page: 2, limit: 10, totalPages: 3 }),
  );
  assert.deepEqual(list, {
    items: [readAdminPaymentRow(safeRow())],
    total: 23,
    page: 2,
    limit: 10,
    totalPages: 3,
  });

  for (const data of [
    null,
    [],
    {},
    safeList({ items: {} }),
    safeList({ items: [safeRow({ paymentId: "bad" })] }),
    safeList({ total: -1 }),
    safeList({ page: 0 }),
    safeList({ limit: 51 }),
    safeList({ totalPages: "3" }),
    safeList({ limit: 1, items: [safeRow(), safeRow()] }),
  ]) {
    assert.equal(readAdminPaymentList(data), null, JSON.stringify(data));
  }
});

test("Admin payment formatting uses safe missing values and known status labels", () => {
  assert.equal(formatAdminPaymentAmount(95.5), "95.50");
  assert.equal(formatAdminPaymentAmount(null), "—");
  assert.equal(formatAdminPaymentAmount(Number.NaN), "—");
  assert.match(formatAdminPaymentDate(CREATED_AT), /2026/);
  assert.equal(formatAdminPaymentDate("not-a-date"), "—");
  assert.equal(formatAdminPaymentDate(null), "—");

  assert.equal(adminPaymentStatusLabel("checkout_pending"), "Checkout started");
  assert.equal(adminPaymentStatusLabel("paid"), "Paid");
  assert.equal(adminPaymentStatusLabel("invented"), "Unknown");
  assert.equal(adminPaymentStatusVariant("paid"), "default");
  assert.equal(adminPaymentStatusVariant("processing"), "secondary");
  assert.equal(adminPaymentStatusVariant("expired"), "destructive");
  assert.equal(adminPaymentStatusVariant("invented"), "outline");

  assert.equal(hasAdminPaymentFilters({ status: "paid", search: "" }), true);
  assert.equal(hasAdminPaymentFilters({ status: "", search: "  " }), false);
});

test("Admin transaction errors remain user-safe and preserve server messages", () => {
  assert.match(
    adminPaymentErrorMessage({
      ok: false,
      status: 400,
      message: "The payments query is not supported.",
    }),
    /query is not supported/i,
  );
  assert.match(adminPaymentErrorMessage({ ok: false, status: 401 }), /sign in/i);
  assert.match(
    adminPaymentErrorMessage({ ok: false, status: 403 }),
    /permission/i,
  );
  assert.match(
    adminPaymentErrorMessage({ ok: false, status: 0 }),
    /couldn’t reach/i,
  );
  assert.equal(
    adminPaymentErrorMessage({ ok: false, status: 500, message: "Specific failure." }),
    "Specific failure.",
  );
});

test("Admin transactions panel is read-only and covers filters, states, and safe fields", () => {
  const panel = source("src/components/dashboard/admin-transactions-panel.jsx");

  for (const token of [
    '"use client"',
    "paymentApi.listAdminPayments",
    "readAdminPaymentList",
    "DEFAULT_ADMIN_PAYMENT_LIMIT",
    'sort: "newest"',
    'aria-label="Loading payment transactions"',
    'role="alert"',
    'role="status"',
    'aria-label="Admin payment transactions"',
    "STATUS_FILTERS",
    "handleSearchSubmit",
    "handleClearFilters",
    "handleRefresh",
    "BookingPagination",
    'label="Admin transaction pages"',
    "row.serviceTitle",
    "row.customerName",
    "row.customerEmail",
    "row.technicianName",
    "formatAdminPaymentAmount(row.amount)",
    "row.currency",
    "StatusBadge",
    'row.paidAt ? formatAdminPaymentDate(row.paidAt) : "Not paid"',
    "formatAdminPaymentDate(recordDate(row))",
    "sm:grid-cols-2",
  ]) {
    assert.ok(panel.includes(token), `Admin transaction panel is missing ${token}`);
  }

  const apiCalls = panel.match(/paymentApi\.\w+/g) ?? [];
  assert.deepEqual([...new Set(apiCalls)], ["paymentApi.listAdminPayments"]);

  for (const forbidden of [
    "stripePaymentIntentId",
    "stripeCheckoutSessionId",
    "checkoutUrl",
    "amountCents",
    "webhook",
    "rawDocument",
    "refund",
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
  ]) {
    assert.equal(panel.includes(forbidden), false, forbidden);
  }
});
