import { AUTHORIZATION_HEADER, extractBearerToken } from "./bearer-auth.js";
import { resolveServerApiOrigin } from "./profile-proxy.js";
import {
  ADMIN_PAYMENTS_UPSTREAM_PATH,
  BOOKING_PAYMENT_STATUSES,
  CHECKOUT_UPSTREAM_PATH,
  CUSTOMER_PAYMENT_HISTORY_UPSTREAM_PATH,
  MAX_QUERY_LIMIT,
  MAX_QUERY_PAGE,
  PAYMENT_STATUSES,
  SESSION_UPSTREAM_PATH,
  hasQueryParameters,
  isValidCheckoutSessionId,
  isValidObjectId,
  parseCheckoutBody,
  resolveAdminPaymentQuery,
  resolveCustomerPaymentHistoryQuery,
} from "./payment-contract.js";

const REQUEST_TIMEOUT_MS = 7000;
const MAX_RESPONSE_LENGTH = 1024 * 1024;
const MAX_CHECKOUT_BODY_LENGTH = 4096;
const MAX_ERROR_MESSAGE_LENGTH = 500;

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;
const ERROR_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const TRANSACTION_ID_PATTERN = /^pi_[A-Za-z0-9]{1,252}$/;

function errorResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

function malformedUpstreamResponse() {
  return errorResponse(
    502,
    "INVALID_UPSTREAM_RESPONSE",
    "The server returned an unexpected response.",
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function projectNullableString(value, maximum) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > maximum) return undefined;
  return value;
}

function projectNullableNumber(value) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function projectNullableStatus(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !PAYMENT_STATUSES.includes(value)) return undefined;
  return value;
}

function projectNullableDate(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

function projectInteger(value, { minimum, maximum }) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return undefined;
  if (value < minimum || value > maximum) return undefined;
  return value;
}

// A transaction reference is strictly the verified PaymentIntent id. A null
// means it was not recorded; a Checkout Session id is never accepted here.
function projectTransactionId(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !TRANSACTION_ID_PATTERN.test(value)) {
    return undefined;
  }
  return value;
}

function projectCheckout(data) {
  if (!isPlainObject(data)) return null;

  const { checkoutUrl, paymentId, sessionId, status } = data;
  if (
    typeof checkoutUrl !== "string" ||
    checkoutUrl.length === 0 ||
    checkoutUrl.length > 2048 ||
    typeof paymentId !== "string" ||
    typeof sessionId !== "string" ||
    typeof status !== "string" ||
    !PAYMENT_STATUSES.includes(status)
  ) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    return null;
  }
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== "checkout.stripe.com" ||
    parsedUrl.username ||
    parsedUrl.password ||
    !isValidCheckoutSessionId(sessionId) ||
    !isValidObjectId(paymentId)
  ) {
    return null;
  }

  return { checkoutUrl, paymentId, sessionId, status };
}

function projectCustomerPayment(data) {
  if (!isPlainObject(data)) return null;

  const paymentId = data.paymentId;
  const bookingId = data.bookingId;
  const serviceTitle = projectNullableString(data.serviceTitle, 200);
  const amount = projectNullableNumber(data.amount);
  const currency = projectNullableString(data.currency, 10);
  const status = projectNullableStatus(data.status);
  const paidAt = projectNullableDate(data.paidAt);
  const createdAt = projectNullableDate(data.createdAt);
  const updatedAt = projectNullableDate(data.updatedAt);
  const bookingPaymentStatus = data.bookingPaymentStatus;
  const values = [
    serviceTitle,
    amount,
    currency,
    status,
    paidAt,
    createdAt,
    updatedAt,
  ];

  if (
    !isValidObjectId(paymentId) ||
    !isValidObjectId(bookingId) ||
    values.some((value) => value === undefined) ||
    (bookingPaymentStatus !== null &&
      !BOOKING_PAYMENT_STATUSES.includes(bookingPaymentStatus))
  ) {
    return null;
  }

  return {
    paymentId,
    bookingId,
    serviceTitle,
    amount,
    currency,
    status,
    paidAt,
    createdAt,
    updatedAt,
    bookingPaymentStatus,
  };
}

function projectCustomerHistoryRow(row) {
  if (!isPlainObject(row)) return null;

  const fields = {
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    serviceTitle: projectNullableString(row.serviceTitle, 200),
    technicianName: projectNullableString(row.technicianName, 120),
    amount: projectNullableNumber(row.amount),
    currency: projectNullableString(row.currency, 10),
    status: projectNullableStatus(row.status),
    transactionId: projectTransactionId(row.transactionId),
    paidAt: projectNullableDate(row.paidAt),
    createdAt: projectNullableDate(row.createdAt),
    updatedAt: projectNullableDate(row.updatedAt),
  };

  if (
    !isValidObjectId(fields.paymentId) ||
    !isValidObjectId(fields.bookingId) ||
    Object.values(fields).some((value) => value === undefined)
  ) {
    return null;
  }

  return fields;
}

function projectCustomerHistoryList(data) {
  if (!isPlainObject(data) || !Array.isArray(data.items)) return null;

  const items = data.items.map(projectCustomerHistoryRow);
  const total = projectInteger(data.total, {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  });
  const page = projectInteger(data.page, { minimum: 1, maximum: MAX_QUERY_PAGE });
  const limit = projectInteger(data.limit, { minimum: 1, maximum: MAX_QUERY_LIMIT });
  const totalPages = projectInteger(data.totalPages, {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  });

  if (
    items.some((item) => item === null) ||
    [total, page, limit, totalPages].some((value) => value === undefined)
  ) {
    return null;
  }

  return { items, total, page, limit, totalPages };
}

function projectAdminPaymentSummary(summary) {
  if (!isPlainObject(summary)) return null;

  const currency = projectNullableString(summary.currency, 10);
  const paidCount = projectInteger(summary.paidCount, {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  });
  const totalRevenue =
    typeof summary.totalRevenue === "number" &&
    Number.isFinite(summary.totalRevenue) &&
    summary.totalRevenue >= 0
      ? summary.totalRevenue
      : undefined;

  if (
    currency === undefined ||
    paidCount === undefined ||
    totalRevenue === undefined
  ) {
    return null;
  }

  return { currency, paidCount, totalRevenue };
}

function projectAdminPaymentRow(row) {
  if (!isPlainObject(row)) return null;

  const fields = {
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    serviceTitle: projectNullableString(row.serviceTitle, 200),
    customerName: projectNullableString(row.customerName, 120),
    customerEmail: projectNullableString(row.customerEmail, 254),
    technicianName: projectNullableString(row.technicianName, 120),
    amount: projectNullableNumber(row.amount),
    currency: projectNullableString(row.currency, 10),
    status: projectNullableStatus(row.status),
    transactionId: projectTransactionId(row.transactionId),
    paidAt: projectNullableDate(row.paidAt),
    createdAt: projectNullableDate(row.createdAt),
    updatedAt: projectNullableDate(row.updatedAt),
  };

  if (
    !isValidObjectId(fields.paymentId) ||
    !isValidObjectId(fields.bookingId) ||
    Object.values(fields).some((value) => value === undefined)
  ) {
    return null;
  }

  return fields;
}

function projectAdminPaymentList(data) {
  if (!isPlainObject(data) || !Array.isArray(data.items)) return null;

  const items = data.items.map(projectAdminPaymentRow);
  const total = projectInteger(data.total, {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  });
  const page = projectInteger(data.page, { minimum: 1, maximum: MAX_QUERY_PAGE });
  const limit = projectInteger(data.limit, { minimum: 1, maximum: MAX_QUERY_LIMIT });
  const totalPages = projectInteger(data.totalPages, {
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  });
  const summary = projectAdminPaymentSummary(data.summary);

  if (
    items.some((item) => item === null) ||
    [total, page, limit, totalPages].some((value) => value === undefined) ||
    !summary
  ) {
    return null;
  }

  return { items, total, page, limit, totalPages, summary };
}

function projectError(payload) {
  if (payload.success !== false || !isPlainObject(payload.error)) return null;

  const { code, message } = payload.error;
  if (
    typeof code !== "string" ||
    !ERROR_CODE_PATTERN.test(code) ||
    typeof message !== "string" ||
    message.length === 0 ||
    message.length > MAX_ERROR_MESSAGE_LENGTH ||
    ERROR_CONTROL_PATTERN.test(message)
  ) {
    return null;
  }

  return { success: false, error: { code, message } };
}

function declaredContentLengthExceedsLimit(response) {
  const header = response?.headers?.get?.("content-length");
  if (typeof header !== "string" || header.trim() === "") return false;
  const declared = Number(header);
  return Number.isFinite(declared) && declared > MAX_RESPONSE_LENGTH;
}

async function readUpstreamPayload(response) {
  if (declaredContentLengthExceedsLimit(response)) {
    return {
      ok: false,
      response: errorResponse(
        502,
        "RESPONSE_TOO_LARGE",
        "The server response is too large.",
      ),
    };
  }

  let text;
  try {
    text = await response.text();
  } catch {
    return { ok: false, response: malformedUpstreamResponse() };
  }
  if (text.length > MAX_RESPONSE_LENGTH) {
    return {
      ok: false,
      response: errorResponse(
        502,
        "RESPONSE_TOO_LARGE",
        "The server response is too large.",
      ),
    };
  }
  if (text.trim() === "") return { ok: false, response: malformedUpstreamResponse() };

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, response: malformedUpstreamResponse() };
  }
  if (!isPlainObject(payload)) {
    return { ok: false, response: malformedUpstreamResponse() };
  }

  return { ok: true, payload };
}

function toSafeResponse(response, payload, projectSuccess) {
  if (response.status >= 200 && response.status < 300) {
    if (payload.success !== true) return malformedUpstreamResponse();
    const data = projectSuccess(payload.data);
    if (!data) return malformedUpstreamResponse();
    return Response.json({ success: true, data });
  }

  if (response.status >= 400 && response.status <= 599) {
    const safeError = projectError(payload);
    if (!safeError) return malformedUpstreamResponse();
    return Response.json(safeError, { status: response.status });
  }

  return malformedUpstreamResponse();
}

function createForwarder({
  env,
  fetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const environment = env ?? (typeof process === "undefined" ? {} : process.env);
  const upstreamFetch = fetchImpl ?? fetch;
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : REQUEST_TIMEOUT_MS;

  return async function forwardPaymentRequest({
    path,
    method,
    token,
    body,
    query,
    projectSuccess,
  }) {
    const origin = resolveServerApiOrigin(environment);
    if (!origin) {
      return errorResponse(
        503,
        "API_CONFIGURATION",
        "The server API is not configured.",
      );
    }

    const url = new URL(path, origin);
    if (query) url.search = query.toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await upstreamFetch(url, {
        method,
        headers: {
          Accept: "application/json",
          [AUTHORIZATION_HEADER]: `Bearer ${token}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body } : {}),
        cache: "no-store",
        signal: controller.signal,
      });

      const payload = await readUpstreamPayload(response);
      if (!payload.ok) return payload.response;
      return toSafeResponse(response, payload.payload, projectSuccess);
    } catch {
      return errorResponse(
        503,
        "API_UNAVAILABLE",
        "The server API is temporarily unavailable.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

export function createCheckoutProxyHandler(options = {}) {
  const forward = createForwarder(options);

  return async function handleCheckoutProxy({
    method = "POST",
    authorization,
    body,
    searchParams,
  } = {}) {
    if (method !== "POST") {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    if (hasQueryParameters(searchParams)) {
      return errorResponse(
        400,
        "INVALID_QUERY",
        "Query parameters are not accepted.",
      );
    }
    if (typeof body !== "string" || body.length > MAX_CHECKOUT_BODY_LENGTH) {
      return errorResponse(
        400,
        "INVALID_CHECKOUT_BODY",
        "A JSON object containing only bookingId is required.",
      );
    }

    const parsed = parseCheckoutBody(body);
    if (!parsed.ok) {
      return errorResponse(400, parsed.code, parsed.message);
    }

    return forward({
      path: CHECKOUT_UPSTREAM_PATH,
      method: "POST",
      token,
      body: parsed.body,
      projectSuccess: projectCheckout,
    });
  };
}

export function createSessionProxyHandler(options = {}) {
  const forward = createForwarder(options);

  return async function handleSessionProxy({
    method = "GET",
    sessionId,
    authorization,
    searchParams,
  } = {}) {
    if (method !== "GET") {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    if (!isValidCheckoutSessionId(sessionId)) {
      return errorResponse(
        400,
        "INVALID_SESSION_ID",
        "That Checkout Session id is not valid.",
      );
    }
    if (hasQueryParameters(searchParams)) {
      return errorResponse(
        400,
        "INVALID_QUERY",
        "Query parameters are not accepted.",
      );
    }

    return forward({
      path: `${SESSION_UPSTREAM_PATH}/${encodeURIComponent(sessionId)}`,
      method: "GET",
      token,
      projectSuccess: projectCustomerPayment,
    });
  };
}

export function createAdminPaymentsProxyHandler(options = {}) {
  const forward = createForwarder(options);

  return async function handleAdminPaymentsProxy({
    method = "GET",
    authorization,
    searchParams,
  } = {}) {
    if (method !== "GET") {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const query = resolveAdminPaymentQuery(searchParams);
    if (!query) {
      return errorResponse(
        400,
        "INVALID_QUERY",
        "The payments query is not supported.",
      );
    }

    return forward({
      path: ADMIN_PAYMENTS_UPSTREAM_PATH,
      method: "GET",
      token,
      query,
      projectSuccess: projectAdminPaymentList,
    });
  };
}

export function createCustomerPaymentHistoryProxyHandler(options = {}) {
  const forward = createForwarder(options);

  return async function handleCustomerPaymentHistoryProxy({
    method = "GET",
    authorization,
    searchParams,
  } = {}) {
    if (method !== "GET") {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    const token = extractBearerToken(authorization);
    if (!token) {
      return errorResponse(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const query = resolveCustomerPaymentHistoryQuery(searchParams);
    if (!query) {
      return errorResponse(
        400,
        "INVALID_QUERY",
        "The payment history query is not supported.",
      );
    }

    return forward({
      path: CUSTOMER_PAYMENT_HISTORY_UPSTREAM_PATH,
      method: "GET",
      token,
      query,
      projectSuccess: projectCustomerHistoryList,
    });
  };
}
