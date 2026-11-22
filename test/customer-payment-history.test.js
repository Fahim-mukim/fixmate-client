import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createPaymentApiClient } from "../src/lib/payment-api-client.js";
import {
  CUSTOMER_PAYMENT_HISTORY_PROXY_PATH,
  DEFAULT_CUSTOMER_HISTORY_LIMIT,
  buildCustomerPaymentHistoryQuery,
  resolveCustomerPaymentHistoryQuery,
} from "../src/lib/payment-contract.js";
import {
  CUSTOMER_PAYMENT_HISTORY_ROW_FIELDS,
  customerPaymentErrorMessage,
  customerPaymentStatusLabel,
  customerPaymentStatusVariant,
  formatCustomerPaymentAmount,
  formatCustomerPaymentDate,
  formatTransactionId,
  readCustomerPaymentHistoryList,
  readCustomerPaymentHistoryRow,
} from "../src/lib/customer-payment-history-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const PAYMENT_ID = "507f1f77bcf86cd799439012";
const BOOKING_ID = "507f1f77bcf86cd7994390b2";
const CREATED_AT = "2026-11-22T10:00:00.000Z";

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function safeRow(overrides = {}) {
  return {
    paymentId: PAYMENT_ID,
    bookingId: BOOKING_ID,
    serviceTitle: "Smartphone screen repair",
    technicianName: "Technician One",
    amount: 95.5,
    currency: "usd",
    status: "paid",
    transactionId: "pi_123456789",
    paidAt: "2026-11-22T10:04:00.000Z",
    createdAt: CREATED_AT,
    updatedAt: "2026-11-22T10:05:00.000Z",
    ...overrides,
  };
}

function safeList(overrides = {}) {
  return {
    items: [safeRow()],
    total: 1,
    page: 1,
    limit: DEFAULT_CUSTOMER_HISTORY_LIMIT,
    totalPages: 1,
    ...overrides,
  };
}

test("customer history query accepts only bounded pagination", () => {
  assert.equal(CUSTOMER_PAYMENT_HISTORY_PROXY_PATH, "/api/fixmate/payments/history");
  assert.equal(DEFAULT_CUSTOMER_HISTORY_LIMIT, 10);
  assert.equal(buildCustomerPaymentHistoryQuery({}), "page=1&limit=10");
  assert.equal(
    buildCustomerPaymentHistoryQuery({ page: 2, limit: 5 }),
    "page=2&limit=5",
  );
  assert.equal(
    resolveCustomerPaymentHistoryQuery(
      new URLSearchParams("page=2&limit=5"),
    ).toString(),
    "page=2&limit=5",
  );
  assert.equal(
    buildCustomerPaymentHistoryQuery({
      customerId: "spoof",
      status: "paid",
      search: "Screen",
      role: "admin",
    }),
    "page=1&limit=10",
  );

  for (const options of [
    { page: 0 },
    { page: 100001 },
    { page: "two" },
    { limit: 0 },
    { limit: 51 },
    { limit: "five" },
  ]) {
    assert.equal(buildCustomerPaymentHistoryQuery(options), null, JSON.stringify(options));
  }
});

test("customer history client sends one validated GET with pagination only", async () => {
  const data = safeList({ total: 12, page: 2, limit: 5, totalPages: 3 });
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

  const result = await client.listCustomerPaymentHistory({
    page: 2,
    limit: 5,
    customerId: "spoof",
    status: "paid",
  });

  assert.deepEqual(result, { ok: true, data });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].path,
    `${CUSTOMER_PAYMENT_HISTORY_PROXY_PATH}?page=2&limit=5`,
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.headers, undefined);
});

test("customer history client rejects invalid pagination before any request", async () => {
  let calls = 0;
  const client = createPaymentApiClient({
    authenticatedFetch: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
  });

  const result = await client.listCustomerPaymentHistory({ limit: 51 });
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    code: "INVALID_QUERY",
    message: "The payment history query is not supported.",
  });
  assert.equal(calls, 0);
});

test("customer history rows project only approved display fields", () => {
  const row = readCustomerPaymentHistoryRow(
    safeRow({
      stripePaymentIntentId: "pi_secret_marker",
      stripeCheckoutSessionId: "cs_secret_marker",
      customerEmail: "customer.one@example.test",
      checkoutUrl: "https://evil.example/pay",
      amountCents: 9550,
      webhookEventId: "evt_secret_marker",
      rawDocument: { internal: true },
    }),
  );

  assert.deepEqual([...CUSTOMER_PAYMENT_HISTORY_ROW_FIELDS].sort(), Object.keys(row).sort());
  assert.equal(row.serviceTitle, "Smartphone screen repair");
  assert.equal(row.technicianName, "Technician One");
  assert.equal(row.amount, 95.5);
  assert.equal(row.currency, "usd");
  assert.equal(row.status, "paid");
  assert.equal(row.transactionId, "pi_123456789");

  const serialized = JSON.stringify(row);
  for (const forbidden of [
    "pi_secret_marker",
    "cs_secret_marker",
    "customer.one@example.test",
    "https://evil.example/pay",
    "9550",
    "evt_secret_marker",
    "rawDocument",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  const sparse = readCustomerPaymentHistoryRow({ paymentId: PAYMENT_ID });
  assert.equal(sparse.serviceTitle, "");
  assert.equal(sparse.technicianName, "");
  assert.equal(sparse.amount, null);
  assert.equal(sparse.currency, "");
  assert.equal(sparse.status, "");
  assert.equal(sparse.transactionId, null);
  assert.equal(sparse.paidAt, null);
  assert.equal(sparse.createdAt, null);
  assert.equal(sparse.updatedAt, null);

  assert.equal(readCustomerPaymentHistoryRow(null), null);
  assert.equal(readCustomerPaymentHistoryRow([]), null);
  assert.equal(readCustomerPaymentHistoryRow({ paymentId: "not-an-id" }), null);
  assert.equal(
    readCustomerPaymentHistoryRow(safeRow({ transactionId: "cs_test_a1b2c3d4e5f6" }))
      .transactionId,
    null,
  );
});

test("customer history list requires safe pagination and fails closed on malformed data", () => {
  const list = readCustomerPaymentHistoryList(
    safeList({ total: 12, page: 2, limit: 5, totalPages: 3 }),
  );
  assert.deepEqual(list, {
    items: [readCustomerPaymentHistoryRow(safeRow())],
    total: 12,
    page: 2,
    limit: 5,
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
    assert.equal(readCustomerPaymentHistoryList(data), null, JSON.stringify(data));
  }
});

test("customer history formatting never invents a transaction reference", () => {
  assert.equal(formatTransactionId("pi_123456789"), "pi_123456789");
  assert.equal(formatTransactionId(null), "Unavailable");
  assert.equal(formatTransactionId(""), "Unavailable");
  assert.equal(formatTransactionId("cs_test_a1b2c3d4e5f6"), "Unavailable");
  assert.equal(formatTransactionId("session_pi_forged"), "Unavailable");

  assert.equal(formatCustomerPaymentAmount(95.5), "95.50");
  assert.equal(formatCustomerPaymentAmount(null), "—");
  assert.equal(formatCustomerPaymentAmount(Number.NaN), "—");
  assert.match(formatCustomerPaymentDate(CREATED_AT), /2026/);
  assert.equal(formatCustomerPaymentDate("not-a-date"), "—");

  assert.equal(customerPaymentStatusLabel("paid"), "Paid");
  assert.equal(customerPaymentStatusVariant("paid"), "default");
  assert.equal(customerPaymentStatusVariant("processing"), "secondary");
  assert.equal(customerPaymentStatusVariant("expired"), "destructive");
  assert.equal(customerPaymentStatusVariant("invented"), "outline");

  assert.match(
    customerPaymentErrorMessage({ ok: false, status: 400 }),
    /page is not valid/i,
  );
  assert.match(customerPaymentErrorMessage({ ok: false, status: 401 }), /sign in/i);
  assert.match(customerPaymentErrorMessage({ ok: false, status: 403 }), /permission/i);
  assert.match(
    customerPaymentErrorMessage({ ok: false, status: 503 }),
    /temporarily unavailable/i,
  );
  assert.match(customerPaymentErrorMessage({ ok: false, status: 0 }), /couldn’t reach/i);
});

test("customer payments page renders role-gated server-confirmed history only", () => {
  const page = source("src/app/dashboard/customer/payments/page.js");
  assert.match(page, /expectedRole="customer"/);
  assert.match(page, /<CustomerPaymentHistory \/>/);
  assert.match(page, /server-confirmed payment history/);

  const navigation = source("src/lib/dashboard-navigation.js");
  assert.match(
    navigation,
    /href: "\/dashboard\/customer\/payments", label: "Payments"/,
  );

  const panel = source("src/components/dashboard/customer-payment-history.jsx");
  for (const token of [
    '"use client"',
    "paymentApi.listCustomerPaymentHistory",
    "readCustomerPaymentHistoryList",
    "DEFAULT_CUSTOMER_HISTORY_LIMIT",
    'aria-label="Loading payment history"',
    'role="alert"',
    'role="status"',
    'aria-label="Customer payment history"',
    "row.serviceTitle",
    "row.technicianName",
    "formatCustomerPaymentAmount(row.amount)",
    "row.currency",
    "formatTransactionId(row.transactionId)",
    "formatCustomerPaymentDate(row.paidAt ?? row.createdAt)",
    "BookingPagination",
    "read-only",
  ]) {
    assert.ok(panel.includes(token), `Customer history panel is missing ${token}`);
  }

  const apiCalls = panel.match(/paymentApi\.\w+/g) ?? [];
  assert.deepEqual([...new Set(apiCalls)], ["paymentApi.listCustomerPaymentHistory"]);

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
    "console.",
    "localStorage",
    "sessionStorage",
  ]) {
    assert.equal(panel.includes(forbidden), false, forbidden);
  }
});

test("customer payment history adds no secrets, SDKs, or database writes", () => {
  const files = [
    "src/lib/customer-payment-history-contract.js",
    "src/components/dashboard/customer-payment-history.jsx",
    "src/app/dashboard/customer/payments/page.js",
  ];

  for (const file of files) {
    const contents = source(file);
    assert.doesNotMatch(contents, /NEXT_PUBLIC_/);
    assert.doesNotMatch(contents, /STRIPE_SECRET|STRIPE_WEBHOOK|process\.env\.STRIPE/);
    assert.doesNotMatch(contents, /from\s+["'](?:@)?stripe/);
    assert.doesNotMatch(
      contents,
      /mongodb|MongoClient|insertOne|updateOne|deleteOne|bulkWrite|findOneAndUpdate/i,
    );
    assert.doesNotMatch(contents, /console\./);
    assert.doesNotMatch(contents, /localStorage|sessionStorage|indexedDB/);
  }
});
