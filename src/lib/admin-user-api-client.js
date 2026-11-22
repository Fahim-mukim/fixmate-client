import { createAuthenticatedFetch } from "./authenticated-api.js";
import {
  ADMIN_USER_PROXY_PATH,
  USER_ROLES,
  buildAdminUserQuery,
  isValidAdminUserId,
} from "./admin-user-contract.js";

function failure(status, code, message) {
  return { ok: false, status, code, message };
}

async function readResult(response) {
  const payload = await response.json().catch(() => null);

  if (response.ok && payload?.success === true) {
    return { ok: true, data: payload.data };
  }

  return failure(
    response.status,
    typeof payload?.error?.code === "string" ? payload.error.code : "",
    typeof payload?.error?.message === "string" ? payload.error.message : "",
  );
}

export function createAdminUserApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });

  async function request(segment = "", query = "", init = {}) {
    const path = `${ADMIN_USER_PROXY_PATH}${segment}${query ? `?${query}` : ""}`;

    try {
      return await readResult(
        await requestFetch(path, { method: "GET", ...init }),
      );
    } catch {
      return failure(
        0,
        "CLIENT_REQUEST_FAILED",
        "The user request could not be sent.",
      );
    }
  }

  function listAdminUsers(options) {
    const query = buildAdminUserQuery(options);
    if (!query.ok) {
      return Promise.resolve(failure(400, "INVALID_ADMIN_USER_QUERY", query.message));
    }
    return request("", query.query);
  }

  function getAdminStats() {
    return request("/stats");
  }

  function getAdminUser(id) {
    if (!isValidAdminUserId(id)) {
      return Promise.resolve(failure(400, "INVALID_ADMIN_USER_ID", "Invalid user id."));
    }
    return request(`/${id}`);
  }

  function updateAdminUserRole(id, role) {
    if (!isValidAdminUserId(id)) {
      return Promise.resolve(failure(400, "INVALID_ADMIN_USER_ID", "Invalid user id."));
    }
    if (!USER_ROLES.includes(role)) {
      return Promise.resolve(failure(400, "INVALID_ADMIN_USER_ROLE", "Invalid role."));
    }

    return request(`/${id}/role`, "", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  return Object.freeze({
    listAdminUsers,
    getAdminStats,
    getAdminUser,
    updateAdminUserRole,
  });
}
