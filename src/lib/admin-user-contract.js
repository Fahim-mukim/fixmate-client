import { safeProfileImageUrl } from "./profile-contract.js";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  OBJECT_ID_PATTERN,
} from "./service-utils.js";

export const ADMIN_USER_PROXY_PATH = "/api/fixmate/admin-users";
export const ADMIN_USER_UPSTREAM_PATH = "/api/admin/users";

export const USER_ROLES = Object.freeze(["customer", "technician", "admin"]);

// Mirrors the Server's parseAdminUserListQuery allowlist.
export const USER_ROLE_FILTERS = Object.freeze([
  Object.freeze({ value: "", label: "All roles" }),
  Object.freeze({ value: "customer", label: "Customer" }),
  Object.freeze({ value: "technician", label: "Technician" }),
  Object.freeze({ value: "admin", label: "Admin" }),
]);

const MAX_QUERY_PAGE = 100000;
const MAX_SEARCH_LENGTH = 100;

export { safeProfileImageUrl };

export function isValidAdminUserId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function buildAdminUserQuery({ role, search, page, limit } = {}) {
  const nextRole = role === undefined || role === null ? "" : role;
  const nextSearch = search === undefined || search === null ? "" : search;
  const nextPage = page === undefined ? DEFAULT_PAGE : page;
  const nextLimit = limit === undefined ? DEFAULT_LIMIT : limit;

  const roleValid =
    typeof nextRole === "string" &&
    (nextRole === "" || USER_ROLES.includes(nextRole));
  const searchValid =
    typeof nextSearch === "string" &&
    nextSearch.trim().length <= MAX_SEARCH_LENGTH &&
    !nextSearch.includes("\u0000");
  const pageValid =
    Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= MAX_QUERY_PAGE;
  const limitValid =
    Number.isInteger(nextLimit) && nextLimit >= 1 && nextLimit <= MAX_LIMIT;

  if (!roleValid || !searchValid || !pageValid || !limitValid) {
    return { ok: false, message: "Invalid user list query." };
  }

  const trimmedSearch = nextSearch.trim();
  const params = new URLSearchParams();
  if (nextRole !== "") params.set("role", nextRole);
  if (trimmedSearch !== "") params.set("search", trimmedSearch);
  params.set("page", String(nextPage));
  params.set("limit", String(nextLimit));

  return {
    ok: true,
    query: params.toString(),
    role: nextRole,
    search: trimmedSearch,
    page: nextPage,
    limit: nextLimit,
  };
}

export function formatAdminUserCreatedAt(value) {
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

export function adminUserErrorMessage(result, fallback = "The request could not be completed.") {
  if (!result || result.ok !== false) return fallback;
  if (result.status === 401) return "Your session has expired. Sign in again.";
  if (result.status === 403) return "Admin access is required to inspect users.";
  if (result.status === 404) return "That user is no longer available.";
  return result.message || fallback;
}

export function adminUserRoleErrorMessage(
  result,
  fallback = "The role could not be updated.",
) {
  if (!result || result.ok !== false) return fallback;
  if (result.status === 401) return "Your session has expired. Sign in again.";
  if (result.status === 403) {
    return result.code === "SELF_ROLE_CHANGE_FORBIDDEN"
      ? "You cannot change your own role."
      : "Admin access is required to change user roles.";
  }
  if (result.status === 404) return "That user is no longer available.";
  return result.message || fallback;
}
