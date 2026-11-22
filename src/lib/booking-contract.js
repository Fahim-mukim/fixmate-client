export const BOOKING_STATUSES = Object.freeze([
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
]);

export const ACTIVE_BOOKING_STATUSES = Object.freeze([
  "requested",
  "accepted",
  "in-progress",
]);

export const TERMINAL_BOOKING_STATUSES = Object.freeze([
  "rejected",
  "cancelled",
  "completed",
]);

export const BOOKING_STATUS_LABELS = Object.freeze({
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
});

export const BOOKING_CREATE_FIELDS = Object.freeze([
  "serviceId",
  "customerPhone",
  "address",
  "preferredDate",
  "problemDescription",
]);

export const DEFAULT_BOOKING_LIMIT = 12;
export const MAX_BOOKING_LIMIT = 50;

export const TECHNICIAN_ACTIONS_BY_STATUS = Object.freeze({
  requested: Object.freeze(["accept", "reject"]),
  accepted: Object.freeze(["start"]),
  "in-progress": Object.freeze(["complete"]),
});

const ACTION_STATUS = Object.freeze({
  accept: "accepted",
  reject: "rejected",
  start: "in-progress",
  complete: "completed",
});

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]*$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const POSITIVE_AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(text) {
  const match = DATE_ONLY_PATTERN.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidBookingId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function validateBookingCreateInput(input = {}) {
  const errors = {};

  if (!isValidBookingId(input.serviceId)) {
    errors.serviceId = "Open a valid service detail page before requesting a booking.";
  }

  const phone = trimmed(input.customerPhone);
  if (phone.length < 7 || phone.length > 25 || !PHONE_PATTERN.test(phone)) {
    errors.customerPhone = "Enter a phone number using 7 to 15 digits.";
  } else {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      errors.customerPhone = "Enter a phone number using 7 to 15 digits.";
    }
  }

  const address = trimmed(input.address);
  if (address.length < 5 || address.length > 240) {
    errors.address = "Enter an address between 5 and 240 characters.";
  }

  const preferredDate = trimmed(input.preferredDate);
  let date = null;
  if (DATE_ONLY_PATTERN.test(preferredDate)) {
    date = parseDateOnly(preferredDate);
  } else if (ISO_DATE_TIME_PATTERN.test(preferredDate)) {
    const parsed = new Date(preferredDate);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!date || date.getTime() <= Date.now()) {
    errors.preferredDate = "Choose a future date.";
  }

  const description = trimmed(input.problemDescription);
  if (description.length < 20 || description.length > 2000) {
    errors.problemDescription =
      "Describe the problem in at least 20 meaningful characters.";
  }

  return errors;
}

export function buildBookingCreateBody(input = {}) {
  const errors = validateBookingCreateInput(input);
  const firstError = Object.values(errors)[0];
  if (firstError) throw new Error(firstError);

  return {
    serviceId: trimmed(input.serviceId),
    customerPhone: trimmed(input.customerPhone),
    address: trimmed(input.address),
    preferredDate: trimmed(input.preferredDate),
    problemDescription: trimmed(input.problemDescription),
  };
}

export function createSubmissionGuard() {
  let active = false;

  return Object.freeze({
    begin() {
      if (active) return false;
      active = true;
      return true;
    },
    finish() {
      active = false;
    },
    get active() {
      return active;
    },
  });
}

export function parsePositiveAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!POSITIVE_AMOUNT_PATTERN.test(text)) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildTransitionBody(action, finalAmount) {
  const status = ACTION_STATUS[action];
  if (!status) throw new Error("That status action is not supported.");

  if (action !== "complete") return { status };

  const amount = parsePositiveAmount(finalAmount);
  if (amount === null) {
    throw new Error("Enter a valid positive final amount.");
  }
  return { status, finalAmount: amount };
}

export function canCustomerCancel(booking) {
  return booking?.status === "requested";
}

export function getTechnicianActions(status) {
  return TECHNICIAN_ACTIONS_BY_STATUS[status] ?? Object.freeze([]);
}

export function getAdminActions() {
  return Object.freeze([]);
}

export function canShowBookingForm(role) {
  return role === "customer";
}

export function getBookingFormVisibility(role) {
  if (role === "customer") {
    return { showForm: true, message: "", href: null, actionLabel: "" };
  }
  if (role === "technician") {
    return {
      showForm: false,
      message: "This is your own service. Incoming requests are managed in your technician dashboard.",
      href: "/dashboard/technician/requests",
      actionLabel: "View requests",
    };
  }
  if (role === "admin") {
    return {
      showForm: false,
      message: "Admin accounts cannot submit customer booking requests. You can inspect bookings in the admin dashboard.",
      href: "/dashboard/admin/bookings",
      actionLabel: "Inspect bookings",
    };
  }

  return {
    showForm: false,
    message: "Sign in as a customer to request this repair service.",
    href: "/sign-in",
    actionLabel: "Sign in to request",
  };
}

export function buildBookingListQuery({ status, page, limit } = {}) {
  const query = {};
  if (BOOKING_STATUSES.includes(status)) query.status = status;

  const parsedPage = Number(page);
  if (Number.isSafeInteger(parsedPage) && parsedPage >= 1) query.page = parsedPage;

  const parsedLimit = Number(limit);
  if (
    Number.isSafeInteger(parsedLimit) &&
    parsedLimit >= 1 &&
    parsedLimit <= MAX_BOOKING_LIMIT
  ) {
    query.limit = parsedLimit;
  } else {
    query.limit = DEFAULT_BOOKING_LIMIT;
  }

  return query;
}

export function bookingErrorMessage(result = {}, fallback = "Unable to load bookings.") {
  const fromServer =
    typeof result.message === "string" && result.message.trim()
      ? result.message.trim()
      : "";

  switch (result.status) {
    case 401:
      return "Your session has expired. Sign in again to continue.";
    case 403:
      return "You do not have permission to view or change these bookings.";
    case 404:
      return fromServer || "That booking or service is no longer available.";
    case 409:
      return fromServer || "This request conflicts with the current booking state. Refresh and try again.";
    case 503:
      return "The booking service is temporarily unavailable. Try again shortly.";
    case 400:
      return fromServer || "Check the details and try again.";
    default:
      return fromServer || result.message || fallback;
  }
}

export function bookingViewState({ loading = false, error = null, items } = {}) {
  if (loading) return "loading";
  if (error) return "error";
  if (!Array.isArray(items) || items.length === 0) return "empty";
  return "ready";
}

export function summarizeBookings(items = []) {
  const summary = {
    total: Array.isArray(items) ? items.length : 0,
    requested: 0,
    accepted: 0,
    rejected: 0,
    "in-progress": 0,
    completed: 0,
    cancelled: 0,
    active: 0,
  };

  if (!Array.isArray(items)) return summary;
  for (const booking of items) {
    if (BOOKING_STATUSES.includes(booking?.status)) {
      summary[booking.status] += 1;
    }
    if (ACTIVE_BOOKING_STATUSES.includes(booking?.status)) {
      summary.active += 1;
    }
  }
  return summary;
}

function toDate(value) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (DATE_ONLY_PATTERN.test(value)) {
    return parseDateOnly(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatBookingDate(value, { withTime = false } = {}) {
  const date = toDate(value);
  if (!date) return "Date not available";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatBookingAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "Not set";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function bookingPaymentLabel(paymentStatus) {
  if (paymentStatus === "paid") return "Paid";
  if (paymentStatus === "unpaid") return "Unpaid";
  return "Not available";
}

export function bookingReference(id) {
  if (!isValidBookingId(id)) return "Not available";
  return id.slice(-6).toUpperCase();
}

export function dashboardHrefForRole(role) {
  if (role === "customer") return "/dashboard/customer";
  if (role === "technician") return "/dashboard/technician";
  if (role === "admin") return "/dashboard/admin";
  return "/sign-in";
}

export function bookingStatusClass(status) {
  switch (status) {
    case "requested":
      return "border-info/30 bg-info/10 text-info";
    case "accepted":
      return "border-teal/30 bg-teal/10 text-teal-strong dark:text-teal";
    case "in-progress":
      return "border-warning/30 bg-warning/10 text-warning";
    case "completed":
      return "border-success/30 bg-success/10 text-success";
    case "rejected":
    case "cancelled":
      return "border-danger/30 bg-danger/10 text-danger";
    default:
      return "border-border bg-mist text-muted-foreground dark:bg-surface-alt";
  }
}
