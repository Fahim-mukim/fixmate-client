import { connection } from "next/server";

import { isValidServiceId } from "@/lib/service-utils";
import { resolveServiceApiOrigin } from "@/lib/test-mode.js";

const REQUEST_TIMEOUT_MS = 7000;

function safeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function requestJson(path) {
  // Next.js 16 evaluates non-public env vars at runtime only after this request boundary.
  await connection();

  const origin = resolveServiceApiOrigin();
  if (!origin) {
    return {
      ok: false,
      reason: "configuration",
      status: 503,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(new URL(path, origin), {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: response.status === 404 ? "not-found" : "api",
        status: response.status,
      };
    }

    try {
      return { ok: true, payload: await response.json() };
    } catch (_) {
      return { ok: false, reason: "invalid-response", status: 502 };
    }
  } catch (_) {
    return { ok: false, reason: "unreachable", status: 503 };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPublicServices(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  const requested = await requestJson(`/api/services?${query.toString()}`);
  if (!requested.ok) return requested;

  const payload = requested.payload;
  const data = payload?.data;
  const page = safeInteger(data?.page);
  const limit = safeInteger(data?.limit);
  const total = safeInteger(data?.total);
  const totalPages = safeInteger(data?.totalPages);

  if (
    payload?.success !== true ||
    !Array.isArray(data?.items) ||
    page === null ||
    limit === null ||
    total === null ||
    totalPages === null
  ) {
    return { ok: false, reason: "invalid-response", status: 502 };
  }

  return {
    ok: true,
    data: {
      items: data.items,
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getPublicServiceById(id) {
  if (!isValidServiceId(id)) {
    return { ok: false, reason: "invalid-id", status: 400 };
  }

  const requested = await requestJson(`/api/services/${id}`);
  if (!requested.ok) return requested;

  const payload = requested.payload;
  if (
    payload?.success !== true ||
    !payload.data ||
    typeof payload.data !== "object" ||
    Array.isArray(payload.data)
  ) {
    return { ok: false, reason: "invalid-response", status: 502 };
  }

  return { ok: true, data: payload.data };
}
