import {
  MAX_QUERY_LIMIT,
  MAX_QUERY_PAGE,
  PAYMENT_STATUSES,
  isValidObjectId,
} from "./payment-contract.js";
import {
  isPendingPaymentStatus,
  isUncompletedPaymentStatus,
  paymentStatusLabel,
} from "./payment-ui-contract.js";

// The exact fields the Admin table may render. Anything else returned by the
// BFF is dropped before it reaches a component.
export const ADMIN_PAYMENT_ROW_FIELDS = Object.freeze([
  "paymentId",
  "serviceTitle",
  "customerName",
  "customerEmail",
  "technicianName",
  "amount",
  "currency",
  "status",
  "paidAt",
  "createdAt",
  "updatedAt",
]);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const AMOUNT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeText(value, maximum) {
  return typeof value === "string" && value.length <= maximum ? value : "";
}

function safeDate(value) {
  if (
    typeof value !== "string" ||
    !ISO_DATE_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    return null;
  }
  return value;
}

function safeCount(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

export function readAdminPaymentRow(row) {
  if (!isPlainObject(row) || !isValidObjectId(row.paymentId)) return null;

  return {
    paymentId: row.paymentId,
    serviceTitle: safeText(row.serviceTitle, 200),
    customerName: safeText(row.customerName, 120),
    customerEmail: safeText(row.customerEmail, 254),
    technicianName: safeText(row.technicianName, 120),
    amount:
      typeof row.amount === "number" &&
      Number.isFinite(row.amount) &&
      row.amount >= 0
        ? row.amount
        : null,
    currency: safeText(row.currency, 10),
    status: PAYMENT_STATUSES.includes(row.status) ? row.status : "",
    paidAt: safeDate(row.paidAt),
    createdAt: safeDate(row.createdAt),
    updatedAt: safeDate(row.updatedAt),
  };
}

export function readAdminPaymentList(data) {
  if (!isPlainObject(data) || !Array.isArray(data.items)) return null;

  const projected = data.items.map(readAdminPaymentRow);
  if (projected.some((item) => item === null)) return null;

  const items = projected;
  const total = safeCount(data.total, 0, Number.MAX_SAFE_INTEGER);
  const page = safeCount(data.page, 1, MAX_QUERY_PAGE);
  const limit = safeCount(data.limit, 1, MAX_QUERY_LIMIT);
  const totalPages = safeCount(data.totalPages, 0, Number.MAX_SAFE_INTEGER);

  if (
    [total, page, limit, totalPages].some((value) => value === null) ||
    items.length > limit
  ) {
    return null;
  }

  return { items, total, page, limit, totalPages };
}

export function formatAdminPaymentAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return AMOUNT_FORMATTER.format(value);
}

export function formatAdminPaymentDate(value) {
  const iso = safeDate(value);
  return iso ? DATE_FORMATTER.format(new Date(iso)) : "—";
}

export function adminPaymentStatusLabel(status) {
  return paymentStatusLabel(status);
}

export function adminPaymentStatusVariant(status) {
  if (status === "paid") return "default";
  if (isPendingPaymentStatus(status)) return "secondary";
  if (isUncompletedPaymentStatus(status)) return "destructive";
  return "outline";
}

export function hasAdminPaymentFilters({ status = "", search = "" } = {}) {
  const nextStatus = typeof status === "string" ? status : "";
  const nextSearch = typeof search === "string" ? search : "";
  return Boolean(nextStatus || nextSearch.trim());
}

export function adminPaymentErrorMessage(
  result,
  fallback = "Unable to load transactions.",
) {
  if (!result || result.ok !== false) return fallback;

  const message = typeof result.message === "string" ? result.message.trim() : "";
  const serverMessage = message || fallback;

  switch (result.status) {
    case 400:
      return serverMessage === fallback
        ? "The selected filters are not valid."
        : serverMessage;
    case 401:
      return "Your session has expired. Sign in again.";
    case 403:
      return "You do not have permission to view payment transactions.";
    case 502:
    case 503:
      return "Payment records are temporarily unavailable. Try again shortly.";
    case 0:
      return "We couldn’t reach the payment service. Check your connection and try again.";
    default:
      return serverMessage;
  }
}
