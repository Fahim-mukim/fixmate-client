import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { CHECKOUT_PROXY_PATH, SESSION_PROXY_PATH } from "../src/lib/payment-contract.js";
import { createPaymentApiClient } from "../src/lib/payment-api-client.js";
import {
  canCustomerPayNow,
  checkoutErrorMessage,
  isPendingPaymentStatus,
  isRetryablePaymentError,
  isSafeCheckoutUrl,
  isUncompletedPaymentStatus,
  paymentStatusLabel,
  paymentStatusPresentation,
  readCheckoutRedirect,
  readPaymentSessionId,
  sessionErrorMessage,
} from "../src/lib/payment-ui-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const BOOKING_ID = "507f1f77bcf86cd799439012";
const PAYMENT_ID = "507f1f77bcf86cd7994390a1";
const SESSION_ID = "cs_test_a1b2c3d4e5f6";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6";
const MODERN_CHECKOUT_URL =
  "https://checkout.stripe.com/g/pay/cs_test_a1b2c3d4e5f6";

function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function captureAuthenticatedFetch(payload, status = 200) {
  const calls = [];
  return {
    calls,
    authenticatedFetch: async (path, init) => {
      calls.push({ path, init });
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

test("Pay Now is visible only to customers with completed unpaid bookings", () => {
  const eligible = {
    _id: BOOKING_ID,
    status: "completed",
    paymentStatus: "unpaid",
  };

  assert.equal(canCustomerPayNow("customer", eligible), true);
  assert.equal(canCustomerPayNow("technician", eligible), false);
  assert.equal(canCustomerPayNow("admin", eligible), false);
  assert.equal(canCustomerPayNow(null, eligible), false);

  for (const booking of [
    null,
    {},
    { ...eligible, _id: "not-an-id" },
    { ...eligible, status: "requested" },
    { ...eligible, status: "in-progress" },
    { ...eligible, paymentStatus: "paid" },
    { ...eligible, paymentStatus: undefined },
  ]) {
    assert.equal(canCustomerPayNow("customer", booking), false);
  }
});

test("success query parsing accepts one valid session id and rejects missing or unsafe values", () => {
  assert.equal(readPaymentSessionId({ session_id: SESSION_ID }), SESSION_ID);
  assert.equal(
    readPaymentSessionId(new URLSearchParams(`session_id=${SESSION_ID}`)),
    SESSION_ID,
  );

  for (const params of [
    undefined,
    {},
    { session_id: "" },
    { session_id: [SESSION_ID] },
    { session_id: [SESSION_ID, "cs_test_zzzzzz"] },
    new URLSearchParams(`session_id=${SESSION_ID}&session_id=cs_test_zzzzzz`),
    { session_id: "cs_test_short" },
    { session_id: "javascript:alert(1)" },
    { session_id: 123 },
  ]) {
    assert.equal(readPaymentSessionId(params), "", JSON.stringify(String(params)));
  }
});

test("only validated HTTPS Stripe Checkout URLs are accepted for redirect", () => {
  assert.equal(isSafeCheckoutUrl(CHECKOUT_URL), true);
  assert.equal(isSafeCheckoutUrl(MODERN_CHECKOUT_URL), true);
  assert.equal(isSafeCheckoutUrl(`${CHECKOUT_URL}?loc=en`), true);
  assert.equal(isSafeCheckoutUrl(`${CHECKOUT_URL}#fid=example`), true);

  for (const value of [
    "",
    null,
    `http://checkout.stripe.com/c/pay/${SESSION_ID}`,
    `http://checkout.stripe.com/g/pay/${SESSION_ID}`,
    `https://checkout.stripe.com.evil.example/c/pay/${SESSION_ID}`,
    `https://checkout.stripe.com.evil.example/g/pay/${SESSION_ID}`,
    `https://checkout.stripe.com/evil/${SESSION_ID}`,
    `https://checkout.stripe.com/h/pay/${SESSION_ID}`,
    `https://evil.example/?next=${CHECKOUT_URL}`,
    `https://user:pass@checkout.stripe.com/c/pay/${SESSION_ID}`,
    `https://checkout.stripe.com:8443/c/pay/${SESSION_ID}`,
    `javascript:${CHECKOUT_URL}`,
    `x`.repeat(2049),
  ]) {
    assert.equal(isSafeCheckoutUrl(value), false, String(value));
  }
});

test("checkout redirect accepts only the projected BFF response and validates it again", () => {
  const data = {
    checkoutUrl: CHECKOUT_URL,
    paymentId: PAYMENT_ID,
    sessionId: SESSION_ID,
    status: "awaiting_payment",
  };
  assert.equal(readCheckoutRedirect(data), CHECKOUT_URL);
  assert.equal(
    readCheckoutRedirect({ ...data, checkoutUrl: MODERN_CHECKOUT_URL }),
    MODERN_CHECKOUT_URL,
  );

  for (const override of [
    { checkoutUrl: "https://evil.example/checkout" },
    { paymentId: "not-an-id" },
    { sessionId: "cs_test_short" },
    { status: "paid_but_not_from_server" },
    { status: undefined },
  ]) {
    assert.equal(readCheckoutRedirect({ ...data, ...override }), null);
  }
  assert.equal(readCheckoutRedirect(null), null);
  assert.equal(readCheckoutRedirect([]), null);
  assert.equal(readCheckoutRedirect("payment"), null);
});

test("payment statuses render only recognized server values with safe categories", () => {
  for (const status of ["checkout_pending", "awaiting_payment", "processing"]) {
    assert.equal(isPendingPaymentStatus(status), true);
    assert.equal(isUncompletedPaymentStatus(status), false);
    assert.equal(paymentStatusPresentation(status).tone, "pending");
  }
  assert.equal(paymentStatusPresentation("paid").tone, "success");
  assert.equal(paymentStatusLabel("paid"), "Paid");

  for (const status of ["checkout_failed", "cancelled", "expired"]) {
    assert.equal(isUncompletedPaymentStatus(status), true);
    assert.equal(paymentStatusPresentation(status).tone, "error");
  }

  assert.equal(paymentStatusPresentation("unexpected").tone, "unknown");
  assert.equal(paymentStatusLabel("unexpected"), "Unknown");
});

test("payment errors are user-safe and only transport failures are retryable", () => {
  assert.match(checkoutErrorMessage({ status: 404 }), /no longer available/i);
  assert.match(checkoutErrorMessage({ status: 409 }), /already in progress/i);
  assert.match(checkoutErrorMessage({ status: 401 }), /sign in/i);
  assert.match(sessionErrorMessage({ status: 404 }), /expired or the link/i);
  assert.match(sessionErrorMessage({ status: 400 }), /not valid/i);
  assert.match(sessionErrorMessage({ status: 0 }), /couldn’t reach/i);

  for (const status of [0, 502, 503]) {
    assert.equal(isRetryablePaymentError({ status }), true);
  }
  for (const status of [400, 401, 403, 404, 409, 200]) {
    assert.equal(isRetryablePaymentError({ status }), false);
  }
});

test("checkout client sends exactly bookingId to the same-origin BFF", async () => {
  const data = {
    checkoutUrl: CHECKOUT_URL,
    paymentId: PAYMENT_ID,
    sessionId: SESSION_ID,
    status: "awaiting_payment",
  };
  const { calls, authenticatedFetch } = captureAuthenticatedFetch({
    success: true,
    data,
  });
  const client = createPaymentApiClient({ authenticatedFetch });

  const result = await client.startCheckout(BOOKING_ID);

  assert.deepEqual(result, { ok: true, data });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, CHECKOUT_PROXY_PATH);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(calls[0].init.body, `{"bookingId":"${BOOKING_ID}"}`);
  assert.deepEqual(Object.keys(JSON.parse(calls[0].init.body)), ["bookingId"]);
  for (const forbidden of ["amount", "role", "status", "customerId", "checkoutUrl"]) {
    assert.equal(calls[0].init.body.includes(forbidden), false, forbidden);
  }
});

test("checkout client rejects invalid or injected booking input before any request", async () => {
  let calls = 0;
  const client = createPaymentApiClient({
    authenticatedFetch: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
  });

  for (const bookingId of ["", null, undefined, "not-an-id", BOOKING_ID.slice(0, -1)]) {
    const result = await client.startCheckout(bookingId);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.code, "INVALID_BOOKING_ID");
  }
  assert.equal(calls, 0);
});

test("session client requests only the validated session path", async () => {
  const data = {
    paymentId: PAYMENT_ID,
    bookingId: BOOKING_ID,
    serviceTitle: "Screen repair",
    amount: 95.5,
    currency: "usd",
    status: "processing",
    paidAt: null,
    createdAt: "2026-11-22T10:00:00.000Z",
    updatedAt: "2026-11-22T10:01:00.000Z",
    bookingPaymentStatus: "unpaid",
  };
  const { calls, authenticatedFetch } = captureAuthenticatedFetch({
    success: true,
    data,
  });
  const client = createPaymentApiClient({ authenticatedFetch });

  assert.deepEqual(await client.getSessionPayment(SESSION_ID), { ok: true, data });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, `${SESSION_PROXY_PATH}/${SESSION_ID}`);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.headers, undefined);
  assert.equal(calls[0].path.includes("?"), false);
});

test("session client rejects invalid ids before any request", async () => {
  let calls = 0;
  const client = createPaymentApiClient({
    authenticatedFetch: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
  });

  for (const sessionId of [
    "",
    null,
    "cs_test_short",
    "cs_test_abc.def",
    "../admin",
    `${SESSION_ID}/extra`,
  ]) {
    const result = await client.getSessionPayment(sessionId);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(result.code, "INVALID_SESSION_ID");
  }
  assert.equal(calls, 0);
});

test("payment client preserves safe BFF errors and maps transport failures", async () => {
  const conflict = captureAuthenticatedFetch(
    {
      success: false,
      error: { code: "PAYMENT_CHECKOUT_CONFLICT", message: "Payment already active." },
    },
    409,
  );
  const conflictResult = await createPaymentApiClient({
    authenticatedFetch: conflict.authenticatedFetch,
  }).startCheckout(BOOKING_ID);
  assert.deepEqual(conflictResult, {
    ok: false,
    status: 409,
    code: "PAYMENT_CHECKOUT_CONFLICT",
    message: "Payment already active.",
  });

  const networkResult = await createPaymentApiClient({
    authenticatedFetch: async () => {
      throw new Error("token failure must not be exposed");
    },
  }).getSessionPayment(SESSION_ID);
  assert.deepEqual(networkResult, {
    ok: false,
    status: 0,
    code: "CLIENT_REQUEST_FAILED",
    message: "The payment request could not be sent.",
  });
});

test("Pay Now component gates eligibility, blocks duplicate clicks, and redirects safely", () => {
  const button = source("src/components/dashboard/customer-pay-now-button.jsx");
  assert.match(button, /canCustomerPayNow\(role, booking\)/);
  assert.match(button, /submissionGuard\.current\.begin\(\)/);
  assert.match(button, /paymentApi\.startCheckout\(booking\._id\)/);
  assert.match(button, /readCheckoutRedirect\(result\.data\)/);
  assert.match(button, /window\.location\.assign\(checkoutUrl\)/);
  assert.match(button, /disabled=\{pending\}/);
  assert.match(button, /aria-busy=\{pending\}/);
  assert.match(button, /role="alert"/);
  assert.doesNotMatch(button, /booking\.status|booking\.paymentStatus|finalAmount/);
  assert.doesNotMatch(button, /amount:|role:|customerId|technicianId|checkoutUrl:/);
  assert.doesNotMatch(button, /fetch\(|XMLHttpRequest|console\./);

  const panel = source("src/components/dashboard/customer-bookings-panel.jsx");
  assert.match(panel, /<CustomerPayNowButton booking=\{booking\} role="customer" \/>/);
  assert.doesNotMatch(panel, /paymentApi/);
});

test("success route validates query on the server and requires the customer role", () => {
  const page = source("src/app/payment/success/page.js");
  assert.match(page, /expectedRole="customer"/);
  assert.match(page, /await searchParams/);
  assert.match(page, /readPaymentSessionId/);
  assert.match(page, /<PaymentSuccessPanel key=\{sessionId \|\| "missing"\} sessionId=\{sessionId\} \/>/);
  assert.doesNotMatch(page, /useSearchParams/);
  assert.doesNotMatch(page, /window|localStorage|sessionStorage/);
});

test("success panel uses only server status, loads once per attempt, and has no polling", () => {
  const panel = source("src/components/payments/payment-success-panel.jsx");
  assert.match(panel, /paymentApi\.getSessionPayment\(sessionId\)/);
  assert.match(panel, /paymentStatusPresentation\(status\)/);
  assert.match(panel, /isPendingPaymentStatus\(status\)/);
  assert.match(panel, /isUncompletedPaymentStatus\(status\)/);
  assert.match(panel, /paymentStatusLabel\(status\)/);
  assert.match(panel, /sessionErrorMessage\(result\)/);
  assert.match(panel, /isRetryablePaymentError\(result\)/);
  assert.match(panel, /Server-confirmed status/);
  assert.match(panel, /CUSTOMER_BOOKINGS_PATH/);
  assert.match(panel, /aria-busy="true"/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /<Skeleton/);
  assert.match(panel, /setAttempt\(\(value\) => value \+ 1\)/);
  assert.doesNotMatch(panel, /checkoutUrl|session_id|payment_intent|PaymentIntent|pi_/);
  assert.doesNotMatch(panel, /setInterval|setTimeout|while\s*\(|for\s*\(/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|indexedDB|console\./);
});

test("cancel flow is customer-only, read-only, and does not claim expiration", () => {
  const page = source("src/app/payment/cancel/page.js");
  assert.match(page, /expectedRole="customer"/);
  assert.match(page, /<PaymentCancelPanel \/>/);

  const panel = source("src/components/payments/payment-cancel-panel.jsx");
  assert.match(panel, /Checkout wasn’t completed/);
  assert.match(panel, /does not change/);
  assert.match(panel, /CUSTOMER_BOOKINGS_PATH/);
  assert.doesNotMatch(panel, /paymentApi|fetch\(|XMLHttpRequest/);
  assert.doesNotMatch(panel, /expired|expiration/i);
  assert.doesNotMatch(panel, /insert|update|delete|PATCH|PUT/i);
});

test("customer payments entry points describe the real Checkout flow", () => {
  const page = source("src/app/dashboard/customer/payments/page.js");
  const panel = source("src/components/dashboard/payments-pending.jsx");
  assert.match(page, /expectedRole="customer"/);
  assert.doesNotMatch(page, /pending in this phase|outside this phase/i);
  assert.match(panel, /Pay Now appears on completed bookings that are still unpaid/);
  assert.match(panel, /CUSTOMER_BOOKINGS_PATH/);
});

test("Phase 16G UI adds no secrets, SDKs, database writes, or browser-side records", () => {
  const files = [
    "src/lib/payment-ui-contract.js",
    "src/lib/payment-api-client.js",
    "src/lib/payment-api.js",
    "src/components/dashboard/customer-pay-now-button.jsx",
    "src/components/payments/payment-success-panel.jsx",
    "src/components/payments/payment-cancel-panel.jsx",
    "src/app/payment/success/page.js",
    "src/app/payment/cancel/page.js",
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

  const packageJson = JSON.parse(source("package.json"));
  assert.equal(packageJson.dependencies?.["@stripe/stripe-js"], undefined);
  assert.equal(packageJson.dependencies?.stripe, undefined);
});
