import { createAuthenticatedFetch } from "./authenticated-api.js";
import {
  ADMIN_PAYMENTS_PROXY_PATH,
  CHECKOUT_PROXY_PATH,
  CUSTOMER_PAYMENT_HISTORY_PROXY_PATH,
  SESSION_PROXY_PATH,
  buildAdminPaymentQuery,
  buildCustomerPaymentHistoryQuery,
  isValidCheckoutSessionId,
  isValidObjectId,
} from "./payment-contract.js";

async function readResult(response) {
  const payload = await response.json().catch(() => null);

  if (response.ok && payload?.success === true) {
    return { ok: true, data: payload.data };
  }

  return {
    ok: false,
    status: response.status,
    code: typeof payload?.error?.code === "string" ? payload.error.code : "",
    message: typeof payload?.error?.message === "string" ? payload.error.message : "",
  };
}

export function createPaymentApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });

  async function request(path, init) {
    try {
      return await readResult(await requestFetch(path, init));
    } catch {
      return {
        ok: false,
        status: 0,
        code: "CLIENT_REQUEST_FAILED",
        message: "The payment request could not be sent.",
      };
    }
  }

  function startCheckout(bookingId) {
    if (!isValidObjectId(bookingId)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_ID",
        message: "That booking cannot be paid from this page.",
      });
    }

    return request(CHECKOUT_PROXY_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
  }

  function getSessionPayment(sessionId) {
    if (!isValidCheckoutSessionId(sessionId)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_SESSION_ID",
        message: "That Checkout Session id is not valid.",
      });
    }

    return request(`${SESSION_PROXY_PATH}/${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });
  }

  // Read-only Admin list. The browser supplies validated filters only; role,
  // ownership, and payment state remain Server-owned.
  function listAdminPayments(options = {}) {
    const query = buildAdminPaymentQuery(options);
    if (query === null) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_QUERY",
        message: "The payments query is not supported.",
      });
    }

    return request(`${ADMIN_PAYMENTS_PROXY_PATH}${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  // Read-only Customer history. The browser supplies pagination only; the
  // Server scopes every row to the authenticated customer.
  function listCustomerPaymentHistory(options = {}) {
    const query = buildCustomerPaymentHistoryQuery(options);
    if (query === null) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_QUERY",
        message: "The payment history query is not supported.",
      });
    }

    return request(
      `${CUSTOMER_PAYMENT_HISTORY_PROXY_PATH}${query ? `?${query}` : ""}`,
      { method: "GET" },
    );
  }

  return Object.freeze({
    startCheckout,
    getSessionPayment,
    listCustomerPaymentHistory,
    listAdminPayments,
  });
}
