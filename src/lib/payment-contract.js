import { OBJECT_ID_PATTERN } from "./service-utils.js";

// Same-origin Client paths and the exact Express paths introduced in Phase 16E.
export const PAYMENT_PROXY_PATH = "/api/fixmate/payments";
export const CHECKOUT_PROXY_PATH = `${PAYMENT_PROXY_PATH}/checkout`;
export const SESSION_PROXY_PATH = `${PAYMENT_PROXY_PATH}/session`;
export const ADMIN_PAYMENTS_PROXY_PATH = `${PAYMENT_PROXY_PATH}/admin`;

export const PAYMENT_UPSTREAM_PATH = "/api/payments";
export const CHECKOUT_UPSTREAM_PATH = `${PAYMENT_UPSTREAM_PATH}/checkout`;
export const SESSION_UPSTREAM_PATH = `${PAYMENT_UPSTREAM_PATH}/session`;
export const ADMIN_PAYMENTS_UPSTREAM_PATH = `${PAYMENT_UPSTREAM_PATH}/admin`;

// Mirrors the Server's payment model and paymentQuery allowlists.
export const PAYMENT_STATUSES = Object.freeze([
  "checkout_pending",
  "awaiting_payment",
  "processing",
  "paid",
  "checkout_failed",
  "cancelled",
  "expired",
]);
export const BOOKING_PAYMENT_STATUSES = Object.freeze(["unpaid", "paid"]);
export const PAYMENT_SORTS = Object.freeze(["newest"]);
export const ADMIN_PAYMENT_QUERY_KEYS = Object.freeze([
  "page",
  "limit",
  "status",
  "search",
  "sort",
]);

export const MAX_PAYMENT_SEARCH_LENGTH = 100;
export const MAX_CHECKOUT_SESSION_ID_LENGTH = 255;
export const MAX_QUERY_PAGE = 100000;
export const MAX_QUERY_LIMIT = 50;
export const DEFAULT_ADMIN_PAYMENT_LIMIT = 10;

const CHECKOUT_SESSION_ID_PATTERN = /^cs_(?:test|live)_[A-Za-z0-9]{6,255}$/;
const UNSAFE_SEARCH_PATTERN = /[$[\]{}]|\u0000/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function isValidObjectId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function isValidCheckoutSessionId(value) {
  return (
    typeof value === "string" &&
    value.length <= MAX_CHECKOUT_SESSION_ID_LENGTH &&
    CHECKOUT_SESSION_ID_PATTERN.test(value)
  );
}

function invalidCheckoutBody() {
  return {
    ok: false,
    code: "INVALID_CHECKOUT_BODY",
    message: "A JSON object containing only bookingId is required.",
  };
}

// The browser may send only a validated booking id. Identity, amount,
// metadata, and redirect URLs always remain Server-owned.
export function parseCheckoutBody(rawBody) {
  if (typeof rawBody !== "string" || rawBody.trim() === "") {
    return invalidCheckoutBody();
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return invalidCheckoutBody();
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return invalidCheckoutBody();
  }

  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== "bookingId") {
    return invalidCheckoutBody();
  }
  if (!isValidObjectId(parsed.bookingId)) {
    return invalidCheckoutBody();
  }

  return {
    ok: true,
    body: JSON.stringify({ bookingId: parsed.bookingId }),
  };
}

export function toSearchParams(value) {
  if (value instanceof URLSearchParams) return value;
  return new URLSearchParams(value ?? {});
}

export function hasQueryParameters(searchParams) {
  for (const _key of toSearchParams(searchParams).keys()) return true;
  return false;
}

function parseBoundedInteger(value, maximum) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) return null;
  return parsed;
}

// Rejects unknown and duplicate keys before validation, then mirrors the
// Server's status/search/sort/page/limit rules. Server still owns role checks.
export function resolveAdminPaymentQuery(searchParams) {
  const params = toSearchParams(searchParams);
  const seen = new Set();

  for (const key of params.keys()) {
    if (!ADMIN_PAYMENT_QUERY_KEYS.includes(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const query = new URLSearchParams();
  for (const key of ADMIN_PAYMENT_QUERY_KEYS) {
    const raw = params.get(key);
    if (raw === null) continue;

    if (key === "page" || key === "limit") {
      const maximum = key === "page" ? MAX_QUERY_PAGE : MAX_QUERY_LIMIT;
      const parsed = parseBoundedInteger(raw, maximum);
      if (parsed === null) return null;
      query.set(key, String(parsed));
      continue;
    }

    const value = raw.trim();
    if (key === "status") {
      if (value === "") continue;
      if (!PAYMENT_STATUSES.includes(value)) return null;
      query.set(key, value);
      continue;
    }

    if (key === "sort") {
      if (value === "") continue;
      if (!PAYMENT_SORTS.includes(value)) return null;
      query.set(key, value);
      continue;
    }

    if (value.length > MAX_PAYMENT_SEARCH_LENGTH) return null;
    if (CONTROL_CHARACTER_PATTERN.test(value) || UNSAFE_SEARCH_PATTERN.test(value)) {
      return null;
    }
    if (value !== "") query.set(key, value);
  }

  return query;
}

// Browser-side guard for the Admin list. Unknown keys are dropped, unsupported
// values fail closed, and the BFF/Server still repeat every validation check.
export function buildAdminPaymentQuery({
  page = 1,
  limit = DEFAULT_ADMIN_PAYMENT_LIMIT,
  status = "",
  search = "",
  sort = "newest",
} = {}) {
  const params = new URLSearchParams();
  const values = { page, limit, status, search, sort };

  for (const key of ADMIN_PAYMENT_QUERY_KEYS) {
    const value = values[key];
    if (value === undefined || value === null) continue;
    const text = typeof value === "string" ? value.trim() : String(value);
    if (text !== "") params.set(key, text);
  }

  const query = resolveAdminPaymentQuery(params);
  return query ? query.toString() : null;
}
