import { createAuthenticatedFetch } from "./authenticated-api.js";
import {
  SERVICE_MANAGEMENT_PROXY_PATH,
  buildOwnedServiceQuery,
  buildServiceWriteBody,
  isValidServiceId,
} from "./service-management-contract.js";

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

export function createServiceManagementApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });

  async function request(method, segment = "", { query = "", body } = {}) {
    const path = `${SERVICE_MANAGEMENT_PROXY_PATH}${segment}${
      query ? `?${query}` : ""
    }`;
    const init = { method };

    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    try {
      return await readResult(await requestFetch(path, init));
    } catch {
      return failure(
        0,
        "CLIENT_REQUEST_FAILED",
        "The service request could not be sent.",
      );
    }
  }

  function listOwnedServices(options) {
    const query = buildOwnedServiceQuery(options);
    if (!query.ok) {
      return Promise.resolve(failure(400, "INVALID_SERVICE_QUERY", query.message));
    }
    return request("GET", "", { query: query.query });
  }

  function createService(input) {
    let body;
    try {
      body = buildServiceWriteBody(input);
    } catch (error) {
      return Promise.resolve(
        failure(400, "INVALID_SERVICE_INPUT", error.message),
      );
    }
    return request("POST", "", { body });
  }

  function updateService(id, input) {
    if (!isValidServiceId(id)) {
      return Promise.resolve(
        failure(400, "INVALID_SERVICE_ID", "Invalid service id."),
      );
    }

    let body;
    try {
      body = buildServiceWriteBody(input);
    } catch (error) {
      return Promise.resolve(
        failure(400, "INVALID_SERVICE_INPUT", error.message),
      );
    }
    return request("PATCH", `/${id}`, { body });
  }

  function deleteService(id) {
    if (!isValidServiceId(id)) {
      return Promise.resolve(
        failure(400, "INVALID_SERVICE_ID", "Invalid service id."),
      );
    }
    return request("DELETE", `/${id}`);
  }

  return Object.freeze({
    listOwnedServices,
    createService,
    updateService,
    deleteService,
  });
}
