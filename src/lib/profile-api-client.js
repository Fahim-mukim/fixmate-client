import { createAuthenticatedFetch } from "./authenticated-api.js";
import { buildProfileUpdateBody } from "./profile-contract.js";

export const PROFILE_PROXY_PATH = "/api/fixmate/profile";

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

export function createProfileApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });

  async function request(method, body) {
    const init = { method };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    try {
      return await readResult(await requestFetch(PROFILE_PROXY_PATH, init));
    } catch {
      return {
        ok: false,
        status: 0,
        code: "CLIENT_REQUEST_FAILED",
        message: "The profile request could not be sent.",
      };
    }
  }

  function getProfile() {
    return request("GET");
  }

  function updateProfile(input) {
    let body;
    try {
      body = buildProfileUpdateBody(input);
    } catch (error) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_PROFILE_INPUT",
        message: error.message,
      });
    }
    return request("PATCH", body);
  }

  return Object.freeze({ getProfile, updateProfile });
}
