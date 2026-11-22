import test from "node:test";
import assert from "node:assert/strict";

import {
  PROFILE_PROXY_PATH,
  createProfileApiClient,
} from "../src/lib/profile-api-client.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("profile API client reads through the authenticated same-origin proxy", async () => {
  const calls = [];
  const profile = {
    id: "user-1",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "customer",
    phone: "",
    area: "",
    bio: "",
    image: null,
  };
  const client = createProfileApiClient({
    getAccessToken: async () => "signed-token",
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, data: profile });
    },
  });

  const result = await client.getProfile();

  assert.deepEqual(result, { ok: true, data: profile });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, PROFILE_PROXY_PATH);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.body, undefined);
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(
    new Headers(calls[0].init.headers).get("authorization"),
    "Bearer signed-token",
  );
});

test("profile API client sends only the allowlisted PATCH body", async () => {
  const calls = [];
  const client = createProfileApiClient({
    authenticatedFetch: async (path, init) => {
      calls.push({ path, init });
      return jsonResponse({
        success: true,
        data: {
          name: "Updated Name",
          phone: "+15551234567",
          area: "Mirpur",
          bio: "Smart device repairs.",
        },
      });
    },
  });

  const result = await client.updateProfile({
    name: "  Updated Name  ",
    phone: " +1 (555) 123-4567 ",
    area: " Mirpur ",
    bio: " Smart device repairs. ",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.name, "Updated Name");
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    name: "Updated Name",
    phone: "+1 (555) 123-4567",
    area: "Mirpur",
    bio: "Smart device repairs.",
  });
  assert.equal(
    new Headers(calls[0].init.headers).get("content-type"),
    "application/json",
  );
});

test("profile API client blocks invalid input before any request", async () => {
  let fetched = false;
  const client = createProfileApiClient({
    authenticatedFetch: async () => {
      fetched = true;
      return jsonResponse({ success: true, data: {} });
    },
  });

  const result = await client.updateProfile({ email: "new@example.com" });

  assert.equal(fetched, false);
  assert.deepEqual(result, {
    ok: false,
    status: 400,
    code: "INVALID_PROFILE_INPUT",
    message: 'Field "email" is not allowed.',
  });
});

test("profile API client surfaces API and transport errors", async () => {
  const failedApi = createProfileApiClient({
    authenticatedFetch: async () =>
      jsonResponse(
        { success: false, error: { code: "PROFILE_NOT_FOUND", message: "Profile not found." } },
        404,
      ),
  });
  const failedTransport = createProfileApiClient({
    authenticatedFetch: async () => {
      throw new Error("offline");
    },
  });

  assert.deepEqual(await failedApi.getProfile(), {
    ok: false,
    status: 404,
    code: "PROFILE_NOT_FOUND",
    message: "Profile not found.",
  });
  assert.deepEqual(await failedTransport.getProfile(), {
    ok: false,
    status: 0,
    code: "CLIENT_REQUEST_FAILED",
    message: "The profile request could not be sent.",
  });
});
