import test from "node:test";
import assert from "node:assert/strict";

import {
  UPLOAD_PROXY_PATH,
  createUploadApiClient,
} from "../src/lib/upload-api-client.js";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const HOSTED_URL = "https://i.imgbb.com/phase11.png";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(fetchImpl, overrides = {}) {
  return createUploadApiClient({
    getAccessToken: async () => "signed-token",
    fetchImpl,
    readImageFile: async () => PNG_BASE64,
    ...overrides,
  });
}

function imageFile(overrides = {}) {
  return {
    name: "photo.png",
    type: "image/png",
    size: 68,
    ...overrides,
  };
}

test("upload API client posts only the contract body through the authenticated proxy", async () => {
  const calls = [];
  const client = clientWith(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({
      success: true,
      data: { purpose: "profile", imageUrl: HOSTED_URL, user: { image: HOSTED_URL } },
    });
  });

  const result = await client.uploadImage("profile", imageFile());

  assert.equal(result.ok, true);
  assert.equal(result.data.imageUrl, HOSTED_URL);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, UPLOAD_PROXY_PATH);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.get("authorization"), "Bearer signed-token");
  assert.equal(calls[0].init.headers.get("content-type"), "application/json");
  assert.equal(calls[0].init.credentials, "omit");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    purpose: "profile",
    fileName: "photo.png",
    mimeType: "image/png",
    imageData: PNG_BASE64,
  });
});

test("upload API client rejects invalid files before any request", async () => {
  const calls = [];
  const client = clientWith(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({ success: true, data: {} });
  });

  const result = await client.uploadImage("service", imageFile({
    type: "image/svg+xml",
    name: "photo.svg",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_IMAGE_FILE");
  assert.equal(calls.length, 0);
});

test("upload API client preserves server error codes", async () => {
  const client = clientWith(async () => jsonResponse({
    success: false,
    error: { code: "FORBIDDEN", message: "Technician role required." },
  }, 403));

  const result = await client.uploadImage("service", imageFile());

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    code: "FORBIDDEN",
    message: "Technician role required.",
  });
});

test("upload API client accepts documented i.ibb.co success responses", async () => {
  const client = clientWith(async () => jsonResponse({
    success: true,
    data: { purpose: "service", imageUrl: "https://i.ibb.co/w04Prt6/c1f64245afb2.gif" },
  }));

  const result = await client.uploadImage("service", imageFile());

  assert.equal(result.ok, true);
  assert.equal(result.data.imageUrl, "https://i.ibb.co/w04Prt6/c1f64245afb2.gif");
  assert.equal(result.data.purpose, "service");
});

test("upload API client rejects unexpected image hosts and network failures safely", async () => {
  const badHost = clientWith(async () => jsonResponse({
    success: true,
    data: { imageUrl: "https://example.com/photo.png" },
  }));
  const badHostResult = await badHost.uploadImage("profile", imageFile());
  assert.equal(badHostResult.ok, false);
  assert.equal(badHostResult.code, "INVALID_UPLOAD_RESPONSE");

  const offline = clientWith(async () => {
    throw new Error("network down");
  });
  const offlineResult = await offline.uploadImage("profile", imageFile());
  assert.equal(offlineResult.ok, false);
  assert.equal(offlineResult.code, "CLIENT_REQUEST_FAILED");
  assert.equal(offlineResult.message, "The image upload could not be sent.");
});
