import test from "node:test";
import assert from "node:assert/strict";

import { AUTHORIZATION_HEADER } from "../src/lib/bearer-auth.js";
import {
  UPLOAD_PROXY_PATH,
  UPLOAD_UPSTREAM_PATH,
  createUploadProxyHandler,
} from "../src/lib/upload-proxy.js";

const ENV = { FIXMATE_SERVER_API_URL: "https://api.example.com" };
const BODY = JSON.stringify({
  purpose: "profile",
  fileName: "photo.png",
  mimeType: "image/png",
  imageData: "ZmFrZQ==",
});

test("upload proxy constants stay on the documented same-origin and server paths", () => {
  assert.equal(UPLOAD_PROXY_PATH, "/api/fixmate/uploads");
  assert.equal(UPLOAD_UPSTREAM_PATH, "/api/uploads");
});

test("upload proxy rejects unsupported methods, missing tokens, and missing bodies", async () => {
  const handle = createUploadProxyHandler({
    env: ENV,
    fetchImpl: async () => {
      throw new Error("unexpected fetch");
    },
  });

  const wrongMethod = await handle({ method: "GET", authorization: "Bearer signed-token" });
  assert.equal(wrongMethod.status, 405);
  assert.equal((await wrongMethod.json()).error.code, "METHOD_NOT_ALLOWED");

  const unauthorized = await handle({ method: "POST", body: BODY });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).error.code, "AUTHENTICATION_REQUIRED");

  const missingBody = await handle({
    method: "POST",
    authorization: "Bearer signed-token",
  });
  assert.equal(missingBody.status, 400);
  assert.equal((await missingBody.json()).error.code, "VALIDATION_FAILED");
});

test("upload proxy forwards only the authenticated JSON body to the server", async () => {
  const calls = [];
  const handle = createUploadProxyHandler({
    env: ENV,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          success: true,
          data: { purpose: "profile", imageUrl: "https://i.imgbb.com/photo.png" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const response = await handle({
    method: "POST",
    authorization: "Bearer signed-token",
    body: BODY,
    cookie: "better-auth.session_token=should-not-forward",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.imageUrl, "https://i.imgbb.com/photo.png");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.toString(), "https://api.example.com/api/uploads");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, BODY);
  assert.equal(calls[0].init.cache, "no-store");

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get(AUTHORIZATION_HEADER), "Bearer signed-token");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("cookie"), null);
});

test("upload proxy passes upstream errors through and fails closed when unavailable", async () => {
  const upstreamError = createUploadProxyHandler({
    env: ENV,
    fetchImpl: async () => new Response(
      JSON.stringify({
        success: false,
        error: { code: "FORBIDDEN", message: "Technician role required." },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ),
  });
  const forbidden = await upstreamError({
    method: "POST",
    authorization: "Bearer signed-token",
    body: BODY,
  });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, "FORBIDDEN");

  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    throw new Error("offline");
  };
  const unconfigured = createUploadProxyHandler({ env: {}, fetchImpl });
  const configResponse = await unconfigured({
    method: "POST",
    authorization: "Bearer signed-token",
    body: BODY,
  });
  assert.equal(configResponse.status, 503);
  assert.equal((await configResponse.json()).error.code, "API_CONFIGURATION");

  const configured = createUploadProxyHandler({ env: ENV, fetchImpl });
  const largeResponse = await configured({
    method: "POST",
    authorization: "Bearer signed-token",
    body: "x".repeat(8 * 1024 * 1024 + 1),
  });
  assert.equal(largeResponse.status, 413);
  assert.equal((await largeResponse.json()).error.code, "PAYLOAD_TOO_LARGE");

  const outage = await configured({
    method: "POST",
    authorization: "Bearer signed-token",
    body: BODY,
  });
  assert.equal(outage.status, 503);
  assert.equal((await outage.json()).error.code, "API_UNAVAILABLE");
  assert.equal(fetchCount, 1);
});
