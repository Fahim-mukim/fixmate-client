import { safeUploadedImageUrl } from "./image-upload-contract.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  SERVICE_CATEGORIES,
  SERVICE_MODES,
  isValidServiceId,
} from "./service-utils.js";

export const SERVICE_MANAGEMENT_PROXY_PATH = "/api/fixmate/services";
export const SERVICE_UPSTREAM_PATH = "/api/services";

// Mirrors the Server's parseServiceCreateInput/parseServiceUpdateInput allowlist.
export const SERVICE_WRITE_FIELDS = Object.freeze([
  "title",
  "category",
  "description",
  "image",
  "basePrice",
  "estimatedDuration",
  "serviceMode",
  "serviceArea",
  "isAvailable",
]);

export const APPROVAL_STATUSES = Object.freeze([
  "pending",
  "approved",
  "rejected",
]);

export const APPROVAL_STATUS_LABELS = Object.freeze({
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
});

// Mirrors the Server's parseModerationListQuery allowlist. The moderation API
// does not support search, so the Client must not offer a misleading search box.
export const MODERATION_FILTERS = Object.freeze([
  Object.freeze({ value: "pending", label: "Pending" }),
  Object.freeze({ value: "approved", label: "Approved" }),
  Object.freeze({ value: "rejected", label: "Rejected" }),
  Object.freeze({ value: "", label: "All" }),
]);

export const MODERATION_ACTIONS = Object.freeze({
  approve: "approved",
  reject: "rejected",
});

const ACTION_LABELS = Object.freeze({
  approve: "Approved",
  reject: "Rejected",
});

const MODERATION_ACTIONS_BY_STATUS = Object.freeze({
  pending: Object.freeze(["approve", "reject"]),
  rejected: Object.freeze(["approve"]),
  approved: Object.freeze(["reject"]),
});

const EMPTY_MODERATION_ACTIONS = Object.freeze([]);

const PRICE_PATTERN = /^\d+(\.\d+)?$/;
const MAX_QUERY_PAGE = 100000;

export { isValidServiceId };

export function safeServiceImageUrl(value) {
  // Service images must be hosted URLs returned by the server-mediated upload path.
  return safeUploadedImageUrl(value);
}

export function serviceFormFromService(service) {
  const source = service && typeof service === "object" ? service : {};

  return {
    title: typeof source.title === "string" ? source.title : "",
    category: SERVICE_CATEGORIES.includes(source.category) ? source.category : "",
    description: typeof source.description === "string" ? source.description : "",
    image: safeServiceImageUrl(source.image) ?? "",
    basePrice:
      typeof source.basePrice === "number" &&
      Number.isFinite(source.basePrice) &&
      source.basePrice > 0
        ? String(source.basePrice)
        : "",
    estimatedDuration:
      typeof source.estimatedDuration === "string" ? source.estimatedDuration : "",
    serviceMode: SERVICE_MODES.includes(source.serviceMode) ? source.serviceMode : "",
    serviceArea: typeof source.serviceArea === "string" ? source.serviceArea : "",
    isAvailable:
      typeof source.isAvailable === "boolean" ? source.isAvailable : true,
  };
}

function boundedText(value, field, minimum, maximum, errors) {
  if (typeof value !== "string") {
    errors[field] = `${field} must be text.`;
    return "";
  }

  const text = value.trim();
  if (text.length < minimum || text.length > maximum) {
    errors[field] = `${field} must be between ${minimum} and ${maximum} characters.`;
  }
  return text;
}

export function validateServiceForm(form) {
  const source = form && typeof form === "object" ? form : {};
  const errors = {};

  boundedText(source.title, "title", 3, 120, errors);
  if (!SERVICE_CATEGORIES.includes(source.category)) {
    errors.category = "Choose a supported service category.";
  }
  boundedText(source.description, "description", 10, 2000, errors);

  if (!safeServiceImageUrl(source.image)) {
    errors.image = "Upload a service image before saving.";
  }

  const price =
    typeof source.basePrice === "string" && PRICE_PATTERN.test(source.basePrice.trim())
      ? Number(source.basePrice)
      : Number.NaN;
  if (!Number.isFinite(price) || price <= 0) {
    errors.basePrice = "Enter a positive base price in USD.";
  }

  boundedText(source.estimatedDuration, "estimatedDuration", 1, 60, errors);
  if (!SERVICE_MODES.includes(source.serviceMode)) {
    errors.serviceMode = "Choose a supported service mode.";
  }
  boundedText(source.serviceArea, "serviceArea", 2, 120, errors);

  if (typeof source.isAvailable !== "boolean") {
    errors.isAvailable = "Choose whether this service is available.";
  }

  return errors;
}

export function buildServiceWriteBody(form) {
  const errors = validateServiceForm(form);
  const firstError = Object.values(errors)[0];
  if (firstError) throw new Error(firstError);

  return Object.freeze({
    title: form.title.trim(),
    category: form.category,
    description: form.description.trim(),
    image: safeServiceImageUrl(form.image),
    basePrice: Number(form.basePrice),
    estimatedDuration: form.estimatedDuration.trim(),
    serviceMode: form.serviceMode,
    serviceArea: form.serviceArea.trim(),
    isAvailable: form.isAvailable,
  });
}

export function buildOwnedServiceQuery({ page, limit } = {}) {
  const nextPage = page === undefined ? DEFAULT_PAGE : page;
  const nextLimit = limit === undefined ? DEFAULT_LIMIT : limit;

  if (
    !Number.isInteger(nextPage) ||
    nextPage < 1 ||
    nextPage > MAX_QUERY_PAGE ||
    !Number.isInteger(nextLimit) ||
    nextLimit < 1 ||
    nextLimit > MAX_LIMIT
  ) {
    return { ok: false, message: "Invalid service list query." };
  }

  const query = new URLSearchParams({
    page: String(nextPage),
    limit: String(nextLimit),
  }).toString();

  return { ok: true, query, page: nextPage, limit: nextLimit };
}

export function buildModerationQuery({ status, page, limit } = {}) {
  const nextStatus = status === undefined || status === null ? "" : status;
  const nextPage = page === undefined ? DEFAULT_PAGE : page;
  const nextLimit = limit === undefined ? DEFAULT_LIMIT : limit;

  const statusValid =
    typeof nextStatus === "string" &&
    (nextStatus === "" || APPROVAL_STATUSES.includes(nextStatus));
  const pageValid =
    Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= MAX_QUERY_PAGE;
  const limitValid =
    Number.isInteger(nextLimit) && nextLimit >= 1 && nextLimit <= MAX_LIMIT;

  if (!statusValid || !pageValid || !limitValid) {
    return { ok: false, message: "Invalid moderation query." };
  }

  const params = new URLSearchParams();
  if (nextStatus !== "") params.set("status", nextStatus);
  params.set("page", String(nextPage));
  params.set("limit", String(nextLimit));

  return {
    ok: true,
    query: params.toString(),
    status: nextStatus,
    page: nextPage,
    limit: nextLimit,
  };
}

export function buildModerationStatusBody(action) {
  if (!Object.prototype.hasOwnProperty.call(MODERATION_ACTIONS, action)) {
    return { ok: false, message: "Unsupported moderation action." };
  }

  return Object.freeze({ ok: true, body: Object.freeze({ status: MODERATION_ACTIONS[action] }) });
}

export function moderationActionsForStatus(status) {
  if (!Object.prototype.hasOwnProperty.call(MODERATION_ACTIONS_BY_STATUS, status)) {
    return EMPTY_MODERATION_ACTIONS;
  }
  return MODERATION_ACTIONS_BY_STATUS[status];
}

export function moderationActionLabel(action) {
  return ACTION_LABELS[action] ?? "";
}

export function formatServiceCreatedAt(value) {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return "Not provided";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function serviceErrorMessage(result, fallback = "The request could not be completed.") {
  if (!result || result.ok !== false) return fallback;
  if (result.code === "CONFLICT") {
    return "This service is referenced by a booking and cannot be deleted.";
  }
  if (result.status === 401) return "Your session has expired. Sign in again.";
  if (result.status === 404) {
    return "That service no longer exists or is not available to you.";
  }
  return result.message || fallback;
}

export function moderationErrorMessage(result, fallback = "The request could not be completed.") {
  if (!result || result.ok !== false) return fallback;
  if (result.status === 401) return "Your session has expired. Sign in again.";
  if (result.status === 403) return "Admin access is required for this action.";
  if (result.status === 404) return "That service is no longer available for review.";
  return result.message || fallback;
}
