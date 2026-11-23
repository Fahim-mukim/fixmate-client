import {
  PAYMENT_STATUSES,
  isValidCheckoutSessionId,
  isValidObjectId,
} from "./payment-contract.js";

export const CUSTOMER_BOOKINGS_PATH = "/dashboard/customer/bookings";
export const PAYMENT_SUCCESS_PATH = "/payment/success";
export const PAYMENT_CANCEL_PATH = "/payment/cancel";
export const STRIPE_CHECKOUT_HOST = "checkout.stripe.com";
// Stripe has served hosted Checkout Sessions from both path prefixes. Keep the
// redirect allowlist limited to these exact Stripe-hosted Checkout routes.
export const STRIPE_CHECKOUT_PATH_PREFIXES = Object.freeze([
  "/c/pay/",
  "/g/pay/",
]);

export const PAYMENT_STATUS_LABELS = Object.freeze({
  checkout_pending: "Checkout started",
  awaiting_payment: "Awaiting payment",
  processing: "Processing",
  paid: "Paid",
  checkout_failed: "Checkout failed",
  cancelled: "Cancelled",
  expired: "Expired",
});

const PAYMENT_PENDING_STATUSES = Object.freeze([
  "checkout_pending",
  "awaiting_payment",
  "processing",
]);
const PAYMENT_UNCOMPLETED_STATUSES = Object.freeze([
  "checkout_failed",
  "cancelled",
  "expired",
]);

const PAYMENT_PRESENTATIONS = Object.freeze({
  checkout_pending: Object.freeze({
    tone: "pending",
    heading: "Payment is still being confirmed",
    description: "The server has started checkout but has not confirmed payment yet.",
  }),
  awaiting_payment: Object.freeze({
    tone: "pending",
    heading: "Payment is still being confirmed",
    description: "The server is waiting for payment to be completed.",
  }),
  processing: Object.freeze({
    tone: "pending",
    heading: "Payment is still being confirmed",
    description: "The server is processing this payment.",
  }),
  paid: Object.freeze({
    tone: "success",
    heading: "Payment complete",
    description: "The server confirms this payment was paid.",
  }),
  checkout_failed: Object.freeze({
    tone: "error",
    heading: "Payment was not completed",
    description: "The server reports that this checkout attempt failed.",
  }),
  cancelled: Object.freeze({
    tone: "error",
    heading: "Payment was not completed",
    description: "The server reports that this payment was cancelled.",
  }),
  expired: Object.freeze({
    tone: "error",
    heading: "Payment was not completed",
    description: "The server reports that this payment session expired.",
  }),
});

const UNKNOWN_PAYMENT_PRESENTATION = Object.freeze({
  tone: "unknown",
  heading: "Payment status unavailable",
  description: "The server did not return a recognized payment status.",
});

// Frontend UX only. The Server independently rechecks role, ownership,
// persisted status, and amount before it creates a Checkout Session.
export function canCustomerPayNow(role, booking) {
  return (
    role === "customer" &&
    isValidObjectId(booking?._id) &&
    booking?.status === "completed" &&
    booking?.paymentStatus === "unpaid"
  );
}

export function readPaymentSessionId(searchParams) {
  let value;

  if (typeof searchParams?.getAll === "function") {
    const values = searchParams.getAll("session_id");
    if (values.length !== 1) return "";
    value = values[0];
  } else {
    value = searchParams?.session_id;
  }

  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return isValidCheckoutSessionId(trimmed) ? trimmed : "";
}

export function isSafeCheckoutUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return (
    parsed.protocol === "https:" &&
    parsed.hostname === STRIPE_CHECKOUT_HOST &&
    STRIPE_CHECKOUT_PATH_PREFIXES.some((prefix) =>
      parsed.pathname.startsWith(prefix),
    ) &&
    parsed.port === "" &&
    parsed.username === "" &&
    parsed.password === ""
  );
}

// The browser never constructs a Checkout URL. It only accepts the narrowly
// projected response from its own same-origin BFF, then validates it again.
export function readCheckoutRedirect(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (!isValidObjectId(data.paymentId)) return null;
  if (!isValidCheckoutSessionId(data.sessionId)) return null;
  if (!PAYMENT_STATUSES.includes(data.status)) return null;
  if (!isSafeCheckoutUrl(data.checkoutUrl)) return null;
  return data.checkoutUrl;
}

export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] ?? "Unknown";
}

export function paymentStatusPresentation(status) {
  const presentation = PAYMENT_PRESENTATIONS[status] ?? UNKNOWN_PAYMENT_PRESENTATION;
  return { ...presentation, label: paymentStatusLabel(status) };
}

export function isPendingPaymentStatus(status) {
  return PAYMENT_PENDING_STATUSES.includes(status);
}

export function isUncompletedPaymentStatus(status) {
  return PAYMENT_UNCOMPLETED_STATUSES.includes(status);
}

export function isRetryablePaymentError(result) {
  return [0, 502, 503].includes(result?.status);
}

function serverMessage(result, fallback) {
  const message = typeof result?.message === "string" ? result.message.trim() : "";
  return message || fallback;
}

export function checkoutErrorMessage(result, fallback = "Unable to start payment.") {
  switch (result?.status) {
    case 401:
      return "Your session has expired. Sign in again to continue.";
    case 403:
      return "You do not have permission to pay for this booking.";
    case 404:
      return "This booking is no longer available for payment.";
    case 409:
      return "A payment is already in progress for this booking. Refresh your bookings before trying again.";
    case 502:
      return "The payment response could not be verified. Try again.";
    case 503:
      return "Payment is temporarily unavailable. Try again shortly.";
    case 0:
      return "We couldn’t reach the payment service. Check your connection and try again.";
    case 400:
      return serverMessage(result, "This booking cannot be paid from this page.");
    default:
      return serverMessage(result, fallback);
  }
}

export function sessionErrorMessage(result, fallback = "Unable to load the payment status.") {
  switch (result?.status) {
    case 400:
      return "That payment link is not valid.";
    case 401:
      return "Your session has expired. Sign in again to see this payment.";
    case 403:
      return "You do not have permission to view this payment.";
    case 404:
      return "We couldn’t find this payment session. It may have expired or the link may be incorrect.";
    case 409:
      return "This payment session is in an unexpected state. Return to your bookings to continue.";
    case 502:
      return "The payment response could not be verified. Try again.";
    case 503:
      return "Payment status is temporarily unavailable. Try again shortly.";
    case 0:
      return "We couldn’t reach the payment service. Check your connection and try again.";
    default:
      return serverMessage(result, fallback);
  }
}
