import test from "node:test";
import assert from "node:assert/strict";

import {
  PROVISIONING_SECRET_HEADER,
  createProvisioningClient,
} from "../src/lib/provisioning-client.js";

const ENDPOINT = "http://127.0.0.1:5000/api/internal/users";
const SECRET = "test-only-provisioning-secret";

function fakeFetch(response) {
  const calls = [];
  const implementation = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, implementation };
}

test("provisioning client sends the server-owned secret header and JSON payload", async () => {
  const { calls, implementation } = fakeFetch({
    ok: true,
    json: async () => ({ success: true, data: { created: true } }),
  });
  const provision = createProvisioningClient({
    endpoint: ENDPOINT,
    secret: SECRET,
    fetchImpl: implementation,
  });

  const result = await provision({
    authUserId: "auth-user-1",
    role: "customer",
    name: "Test Customer",
    email: "customer@example.com",
  });

  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers[PROVISIONING_SECRET_HEADER], SECRET);
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  assert.equal(
    JSON.parse(calls[0].init.body).authUserId,
    "auth-user-1",
  );
});

test("provisioning client reports failures without echoing the secret", async () => {
  const { implementation } = fakeFetch({ ok: false, status: 401 });
  const provision = createProvisioningClient({
    endpoint: ENDPOINT,
    secret: SECRET,
    fetchImpl: implementation,
  });

  await assert.rejects(
    () => provision({ authUserId: "auth-user-1" }),
    (error) => {
      assert.match(error.message, /401/);
      assert.equal(error.message.includes(SECRET), false);
      return true;
    },
  );
});

test("provisioning client requires endpoint, secret, and object input", async () => {
  assert.throws(
    () => createProvisioningClient({ secret: SECRET }),
    /endpoint is required/,
  );
  assert.throws(
    () => createProvisioningClient({ endpoint: ENDPOINT }),
    /secret is required/,
  );

  const provision = createProvisioningClient({
    endpoint: ENDPOINT,
    secret: SECRET,
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  });
  await assert.rejects(() => provision([]), /input must be an object/);
});
