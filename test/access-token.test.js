import test from "node:test";
import assert from "node:assert/strict";

import { createAccessTokenStore } from "../src/lib/access-token.js";

test("access token store caches the issued token in memory", async () => {
  let calls = 0;
  const store = createAccessTokenStore({
    tokenProvider: async () => {
      calls += 1;
      return "token-1";
    },
  });

  assert.equal(await store.getAccessToken(), "token-1");
  assert.equal(await store.getAccessToken(), "token-1");
  assert.equal(calls, 1);

  store.clearAccessToken();
  assert.equal(await store.getAccessToken(), "token-1");
  assert.equal(calls, 2);
});

test("access token store shares concurrent requests and rejects invalid tokens", async () => {
  let calls = 0;
  const store = createAccessTokenStore({
    tokenProvider: async () => {
      calls += 1;
      await Promise.resolve();
      return "token-2";
    },
  });

  const [first, second] = await Promise.all([
    store.getAccessToken(),
    store.getAccessToken(),
  ]);
  assert.equal(first, "token-2");
  assert.equal(second, "token-2");
  assert.equal(calls, 1);

  const invalid = createAccessTokenStore({ tokenProvider: async () => "" });
  await assert.rejects(() => invalid.getAccessToken(), /valid access token/);
  assert.throws(
    () => createAccessTokenStore({}),
    /tokenProvider is required/,
  );
});
