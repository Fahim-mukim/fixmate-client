import test from "node:test";
import assert from "node:assert/strict";

import { canonicalAuthOrigin } from "../src/lib/auth-origin.js";

test("canonicalAuthOrigin normalizes configured origins", () => {
  assert.equal(
    canonicalAuthOrigin({ BETTER_AUTH_URL: "http://localhost:3000/" }),
    "http://localhost:3000",
  );
  assert.equal(
    canonicalAuthOrigin({ BETTER_AUTH_URL: "https://client.example.com///" }),
    "https://client.example.com",
  );
});

test("canonicalAuthOrigin rejects missing, malformed, and non-origin URLs", () => {
  assert.throws(() => canonicalAuthOrigin({}), /BETTER_AUTH_URL is required/);
  assert.throws(
    () => canonicalAuthOrigin({ BETTER_AUTH_URL: "not-a-url" }),
    /must be a valid URL/,
  );
  assert.throws(
    () => canonicalAuthOrigin({ BETTER_AUTH_URL: "ftp://client.example.com" }),
    /must use http or https/,
  );
  assert.throws(
    () => canonicalAuthOrigin({ BETTER_AUTH_URL: "https://user:pass@client.example.com" }),
    /must not contain credentials/,
  );
  assert.throws(
    () => canonicalAuthOrigin({ BETTER_AUTH_URL: "https://client.example.com/app" }),
    /without path, query, or fragment/,
  );
});
