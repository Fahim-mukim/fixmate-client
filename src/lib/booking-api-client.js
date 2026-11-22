import { createAuthenticatedFetch } from "./authenticated-api.js";
import {
  BOOKINGS_PROXY_PATH,
  createBookingProxyRequest,
} from "./booking-proxy.js";
import {
  buildBookingCreateBody,
  buildBookingListQuery,
  buildTransitionBody,
  isValidBookingId,
} from "./booking-contract.js";

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

export function createBookingApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });

  async function request(method, segments, { query, body } = {}) {
    const path = createBookingProxyRequest({
      basePath: BOOKINGS_PROXY_PATH,
      segments,
      query,
    });
    const init = { method };

    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    try {
      return await readResult(await requestFetch(path, init));
    } catch {
      return {
        ok: false,
        status: 0,
        code: "CLIENT_REQUEST_FAILED",
        message: "The booking request could not be sent.",
      };
    }
  }

  function createBooking(input) {
    let body;
    try {
      body = buildBookingCreateBody(input);
    } catch (error) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_INPUT",
        message: error.message,
      });
    }
    return request("POST", [], { body });
  }

  function listMyBookings(query = {}) {
    return request("GET", ["mine"], { query: buildBookingListQuery(query) });
  }

  function getMyBookingStats() {
    return request("GET", ["mine", "stats"]);
  }

  function getBooking(id) {
    if (!isValidBookingId(id)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_ID",
        message: "That booking link is not valid.",
      });
    }
    return request("GET", [id]);
  }

  function cancelBooking(id) {
    if (!isValidBookingId(id)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_ID",
        message: "That booking link is not valid.",
      });
    }
    return request("PATCH", [id, "cancel"], { body: {} });
  }

  function listTechnicianBookings(query = {}) {
    return request("GET", ["technician"], { query: buildBookingListQuery(query) });
  }

  function getTechnicianBookingStats() {
    return request("GET", ["technician", "stats"]);
  }

  function getTechnicianBooking(id) {
    if (!isValidBookingId(id)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_ID",
        message: "That booking link is not valid.",
      });
    }
    return request("GET", ["technician", id]);
  }

  function updateBookingStatus(id, action, finalAmount) {
    if (!isValidBookingId(id)) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_BOOKING_ID",
        message: "That booking link is not valid.",
      });
    }

    let body;
    try {
      body = buildTransitionBody(action, finalAmount);
    } catch (error) {
      return Promise.resolve({
        ok: false,
        status: 400,
        code: "INVALID_STATUS_INPUT",
        message: error.message,
      });
    }
    return request("PATCH", [id, "status"], { body });
  }

  function listAdminBookings(query = {}) {
    return request("GET", ["admin"], { query: buildBookingListQuery(query) });
  }

  return Object.freeze({
    createBooking,
    listMyBookings,
    getMyBookingStats,
    getBooking,
    cancelBooking,
    listTechnicianBookings,
    getTechnicianBookingStats,
    getTechnicianBooking,
    updateBookingStatus,
    listAdminBookings,
  });
}
