import test from "node:test";
import assert from "node:assert/strict";

import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  ADMIN_PAYMENTS_PROXY_PATH,
  ADMIN_PAYMENTS_UPSTREAM_PATH,
  BOOKING_PAYMENT_STATUSES,
  CHECKOUT_PROXY_PATH,
  CHECKOUT_UPSTREAM_PATH,
  PAYMENT_STATUSES,
  SESSION_PROXY_PATH,
  SESSION_UPSTREAM_PATH,
  isValidCheckoutSessionId,
  parseCheckoutBody,
  resolveAdminPaymentQuery,
} from "../src/lib/payment-contract.js";
import {
  createAdminPaymentsProxyHandler,
  createCheckoutProxyHandler,
  createSessionProxyHandler,
} from "../src/lib/payment-proxy.js";

const ENV = { FIXMATE_SERVER_API_URL: "https://api.example.com" };
const BOOKING_ID = "507f1f77bcf86cd799439012";
const PAYMENT_ID = "507f1f77bcf86cd7994390a1";
const BOOKING_ID_TWO = "507f1f77bcf86cd7994390b2";
const SESSION_ID = "cs_test_a1b2c3d4e5f6";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function checkoutData(overrides = {}) {
  return {
    checkoutUrl: CHECKOUT_URL,
    paymentId: PAYMENT_ID,
    sessionId: SESSION_ID,
    status: "awaiting_payment",
    ...overrides,
  };
}

function customerData(overrides = {}) {
  return {
    paymentId: PAYMENT_ID,
    bookingId: BOOKING_ID,
    serviceTitle: "Smartphone screen repair",
    amount: 95.5,
    currency: "usd",
    status: "paid",
    paidAt: "2026-11-22T10:04:00.000Z",
    createdAt: "2026-11-22T10:00:00.000Z",
    updatedAt: "2026-11-22T10:05:00.000Z",
    bookingPaymentStatus: "paid",
    ...overrides,
  };
}

function adminRow(overrides = {}) {
  return {
    paymentId: PAYMENT_ID,
    bookingId: BOOKING_ID,
    serviceTitle: "Smartphone screen repair",
    customerName: "Customer One",
    customerEmail: "customer.one@example.test",
    technicianName: "Technician One",
    amount: 95.5,
    currency: "usd",
    status: "paid",
    paidAt: "2026-11-22T10:04:00.000Z",
    createdAt: "2026-11-22T10:00:00.000Z",
    updatedAt: "2026-11-22T10:05:00.000Z",
    ...overrides,
  };
}

function adminData(overrides = {}) {
  return {
    items: [adminRow()],
    total: 23,
    page: 3,
    limit: 25,
    totalPages: 1,
    ...overrides,
  };
}

function captureFetch(payload, status = 200) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(payload, status);
    },
  };
}

test("payment BFF contract uses only the documented same-origin and Express paths", () => {
  assert.equal(CHECKOUT_PROXY_PATH, "/api/fixmate/payments/checkout");
  assert.equal(SESSION_PROXY_PATH, "/api/fixmate/payments/session");
  assert.equal(ADMIN_PAYMENTS_PROXY_PATH, "/api/fixmate/payments/admin");
  assert.equal(CHECKOUT_UPSTREAM_PATH, "/api/payments/checkout");
  assert.equal(SESSION_UPSTREAM_PATH, "/api/payments/session");
  assert.equal(ADMIN_PAYMENTS_UPSTREAM_PATH, "/api/payments/admin");
  assert.deepEqual([...PAYMENT_STATUSES], [
    "checkout_pending",
    "awaiting_payment",
    "processing",
    "paid",
    "checkout_failed",
    "cancelled",
    "expired",
  ]);
  assert.deepEqual([...BOOKING_PAYMENT_STATUSES], ["unpaid", "paid"]);
  assert.equal(isValidCheckoutSessionId(SESSION_ID), true);
  assert.equal(isValidCheckoutSessionId("cs_live_ABCDEF"), true);
  assert.equal(isValidCheckoutSessionId("cs_test_abc.def"), false);
  assert.equal(isValidCheckoutSessionId("cs_test_short"), false);
  assert.equal(isValidCheckoutSessionId(123), false);
});

test("checkout body accepts only a valid bookingId and admin query mirrors the Server", () => {
  assert.deepEqual(parseCheckoutBody(JSON.stringify({ bookingId: BOOKING_ID })), {
    ok: true,
    body: `{"bookingId":"${BOOKING_ID}"}`,
  });

  for (const body of [
    "",
    "{",
    "[]",
    "null",
    "{}",
    JSON.stringify({ bookingId: BOOKING_ID, amount: 10 }),
    JSON.stringify({ bookingId: "not-an-id" }),
    JSON.stringify({ bookingId: BOOKING_ID, role: "admin" }),
  ]) {
    assert.equal(parseCheckoutBody(body).ok, false, body);
  }

  assert.equal(
    resolveAdminPaymentQuery(
      new URLSearchParams("page=2&limit=25&status=paid&search=Screen&sort=newest"),
    ).toString(),
    "page=2&limit=25&status=paid&search=Screen&sort=newest",
  );
  assert.equal(
    resolveAdminPaymentQuery(new URLSearchParams("page=2&status=&sort=&search=")).toString(),
    "page=2",
  );

  for (const query of [
    "role=admin",
    "customerId=spoof",
    "page=2&page=3",
    "page=0",
    "page=100001",
    "limit=51",
    "status=unknown",
    "sort=oldest",
    "search=%24ne",
    `search=${"x".repeat(101)}`,
  ]) {
    assert.equal(resolveAdminPaymentQuery(new URLSearchParams(query)), null, query);
  }
});

test("checkout BFF forwards only bookingId and a Bearer token, then projects the safe response", async () => {
  const { calls, fetchImpl } = captureFetch({
    success: true,
    data: {
      ...checkoutData(),
      amount: 999999,
      customerId: "spoof",
      internalMarker: "must-not-pass",
    },
    internal: "must-not-pass",
  });
  const handle = createCheckoutProxyHandler({ env: ENV, fetchImpl });

  const response = await handle({
    authorization: "Bearer signed-token",
    body: JSON.stringify({ bookingId: BOOKING_ID }),
    searchParams: new URLSearchParams(),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: checkoutData(),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.toString(), `${ENV.FIXMATE_SERVER_API_URL}${CHECKOUT_UPSTREAM_PATH}`);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, `{"bookingId":"${BOOKING_ID}"}`);
  assert.equal(calls[0].init.cache, "no-store");

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("cookie"), null);
  assert.equal(calls[0].init.credentials, undefined);
});

test("checkout BFF rejects invalid auth, methods, queries, and bodies before fetching", async () => {
  let fetchCount = 0;
  const handle = createCheckoutProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, data: checkoutData() });
    },
  });
  const validBody = JSON.stringify({ bookingId: BOOKING_ID });

  const cases = [
    { authorization: null, body: validBody },
    { authorization: "Basic signed-token", body: validBody },
    { method: "GET", authorization: "Bearer signed-token", body: validBody },
    {
      authorization: "Bearer signed-token",
      body: validBody,
      searchParams: new URLSearchParams("amount=1"),
    },
    { authorization: "Bearer signed-token", body: "{" },
    { authorization: "Bearer signed-token", body: "{}" },
    {
      authorization: "Bearer signed-token",
      body: JSON.stringify({ bookingId: BOOKING_ID, amount: 100 }),
    },
    {
      authorization: "Bearer signed-token",
      body: JSON.stringify({ bookingId: "not-an-id" }),
    },
  ];

  for (const input of cases) {
    const response = await handle(input);
    assert.ok([400, 401, 405].includes(response.status), `unexpected status ${response.status}`);
  }
  assert.equal(fetchCount, 0);
});

test("checkout BFF preserves safe upstream errors and fails closed on transport failures", async () => {
  const forbidden = createCheckoutProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      jsonResponse(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Customer role required.",
            internal: "stack-trace-must-not-pass",
          },
        },
        403,
      ),
  });
  const response = await forbidden({
    authorization: "Bearer signed-token",
    body: JSON.stringify({ bookingId: BOOKING_ID }),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: { code: "FORBIDDEN", message: "Customer role required." },
  });

  const timedOut = createCheckoutProxyHandler({
    env: ENV,
    timeoutMs: 10,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      }),
  });
  const timeoutResponse = await timedOut({
    authorization: "Bearer signed-token",
    body: JSON.stringify({ bookingId: BOOKING_ID }),
  });
  assert.equal(timeoutResponse.status, 503);
  assert.equal((await timeoutResponse.json()).error.code, "API_UNAVAILABLE");

  const malformed = createCheckoutProxyHandler({
    env: ENV,
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });
  const malformedResponse = await malformed({
    authorization: "Bearer signed-token",
    body: JSON.stringify({ bookingId: BOOKING_ID }),
  });
  assert.equal(malformedResponse.status, 502);
  assert.equal((await malformedResponse.json()).error.code, "INVALID_UPSTREAM_RESPONSE");

  const unsafe = createCheckoutProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      jsonResponse({
        success: true,
        data: checkoutData({ checkoutUrl: "http://evil.example/checkout" }),
      }),
  });
  const unsafeResponse = await unsafe({
    authorization: "Bearer signed-token",
    body: JSON.stringify({ bookingId: BOOKING_ID }),
  });
  const unsafeText = await unsafeResponse.text();
  assert.equal(unsafeResponse.status, 502);
  assert.equal(unsafeText.includes("evil.example"), false);
});

test("session BFF forwards the exact id without queries or cookies and projects safe fields", async () => {
  const { calls, fetchImpl } = captureFetch({
    success: true,
    data: { ...customerData(), secret_marker: "must-not-pass", sessionId: SESSION_ID },
  });
  const handle = createSessionProxyHandler({ env: ENV, fetchImpl });

  const response = await handle({
    sessionId: SESSION_ID,
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams(),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: customerData() });
  assert.equal(
    calls[0].url.toString(),
    `${ENV.FIXMATE_SERVER_API_URL}${SESSION_UPSTREAM_PATH}/${SESSION_ID}`,
  );
  assert.equal(calls[0].url.search, "");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("content-type"), null);
});

test("session BFF rejects invalid ids, arbitrary queries, missing auth, and wrong methods", async () => {
  let fetchCount = 0;
  const handle = createSessionProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, data: customerData() });
    },
  });

  for (const sessionId of [
    null,
    "",
    "cs_test_short",
    "cs_test_abc.def",
    "cs_test_abc def",
    "cs_test_abc/def",
    "cs_other_abcdef",
  ]) {
    const response = await handle({
      sessionId,
      authorization: "Bearer signed-token",
    });
    assert.equal(response.status, 400, String(sessionId));
  }

  const withQuery = await handle({
    sessionId: SESSION_ID,
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams("status=paid&userId=spoof"),
  });
  assert.equal(withQuery.status, 400);

  const unauthenticated = await handle({ sessionId: SESSION_ID });
  assert.equal(unauthenticated.status, 401);

  const wrongMethod = await handle({
    method: "POST",
    sessionId: SESSION_ID,
    authorization: "Bearer signed-token",
  });
  assert.equal(wrongMethod.status, 405);
  assert.equal(fetchCount, 0);
});

test("session BFF preserves a safe 404 and rejects oversized or malformed responses", async () => {
  const missing = createSessionProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      jsonResponse(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Payment not found.",
            internal: "must-not-pass",
          },
        },
        404,
      ),
  });
  const missingResponse = await missing({
    sessionId: SESSION_ID,
    authorization: "Bearer signed-token",
  });
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), {
    success: false,
    error: { code: "NOT_FOUND", message: "Payment not found." },
  });

  const oversized = createSessionProxyHandler({
    env: ENV,
    fetchImpl: async () =>
      jsonResponse({ success: true, data: { blob: "x".repeat(1024 * 1024 + 1) } }),
  });
  const oversizedResponse = await oversized({
    sessionId: SESSION_ID,
    authorization: "Bearer signed-token",
  });
  assert.equal(oversizedResponse.status, 502);
  assert.equal((await oversizedResponse.json()).error.code, "RESPONSE_TOO_LARGE");
});

test("admin payments BFF forwards only approved queries and preserves pagination", async () => {
  const { calls, fetchImpl } = captureFetch({
    success: true,
    data: {
      ...adminData(),
      internalMarker: "must-not-pass",
      items: [{ ...adminRow(), stripeCheckoutSessionId: "cs_secret_marker" }],
    },
  });
  const handle = createAdminPaymentsProxyHandler({ env: ENV, fetchImpl });

  const response = await handle({
    authorization: "Bearer signed-token",
    searchParams: new URLSearchParams(
      "page=2&limit=25&status=paid&search=Screen&sort=newest",
    ),
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: adminData() });
  assert.equal(
    calls[0].url.toString(),
    `${ENV.FIXMATE_SERVER_API_URL}${ADMIN_PAYMENTS_UPSTREAM_PATH}?page=2&limit=25&status=paid&search=Screen&sort=newest`,
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("content-type"), null);
});

test("admin payments BFF rejects unknown, duplicate, and malformed queries before fetching", async () => {
  let fetchCount = 0;
  const handle = createAdminPaymentsProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({ success: true, data: adminData() });
    },
  });

  for (const query of [
    "role=admin",
    "userId=spoof",
    "page=2&page=3",
    "limit=2&limit=3",
    "status=unknown",
    "sort=oldest",
    "page=0",
    "page=100001",
    "limit=0",
    "limit=51",
    "search=%24where",
    `search=${"x".repeat(101)}`,
  ]) {
    const response = await handle({
      authorization: "Bearer signed-token",
      searchParams: new URLSearchParams(query),
    });
    assert.equal(response.status, 400, query);
  }

  const unauthenticated = await handle({});
  assert.equal(unauthenticated.status, 401);
  const wrongMethod = await handle({
    method: "POST",
    authorization: "Bearer signed-token",
  });
  assert.equal(wrongMethod.status, 405);
  assert.equal(fetchCount, 0);
});

test("admin payments BFF preserves upstream auth and availability failures without success", async () => {
  for (const status of [401, 403, 503]) {
    const handle = createAdminPaymentsProxyHandler({
      env: ENV,
      fetchImpl: async () =>
        jsonResponse(
          {
            success: false,
            error: {
              code: status === 503 ? "API_UNAVAILABLE" : "FORBIDDEN",
              message: `Upstream ${status}.`,
            },
          },
          status,
        ),
    });
    const response = await handle({ authorization: "Bearer signed-token" });
    assert.equal(response.status, status);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(typeof payload.error.message, "string");
  }
});

test("all payment BFFs fail closed when the server origin is not configured", async () => {
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return jsonResponse({ success: true, data: {} });
  };
  const checkout = createCheckoutProxyHandler({ env: {}, fetchImpl });
  const session = createSessionProxyHandler({ env: {}, fetchImpl });
  const admin = createAdminPaymentsProxyHandler({ env: {}, fetchImpl });

  const responses = await Promise.all([
    checkout({
      authorization: "Bearer signed-token",
      body: JSON.stringify({ bookingId: BOOKING_ID }),
    }),
    session({ sessionId: SESSION_ID, authorization: "Bearer signed-token" }),
    admin({ authorization: "Bearer signed-token" }),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "API_CONFIGURATION");
  }
  assert.equal(fetchCount, 0);
});
