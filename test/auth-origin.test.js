import test from "node:test";
import assert from "node:assert/strict";

import { canonicalAuthOrigin, resolveTrustedOrigins } from "../src/lib/auth-origin.js";

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

test("resolveTrustedOrigins includes canonical and safe Vercel https origins", () => {
  const origins = resolveTrustedOrigins({
    BETTER_AUTH_URL: "https://fixmate-client-snowy.vercel.app",
    VERCEL_URL: "fixmate-client-snowy-abc123.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "fixmate-client-snowy.vercel.app",
  });

  assert.deepEqual(origins, [
    "https://fixmate-client-snowy.vercel.app",
    "https://fixmate-client-snowy-abc123.vercel.app",
  ]);
});

test("resolveTrustedOrigins ignores unsafe or non-https Vercel origin values", () => {
  const origins = resolveTrustedOrigins({
    BETTER_AUTH_URL: "https://fixmate-client-snowy.vercel.app",
    VERCEL_URL: "http://evil.example.com",
    VERCEL_PROJECT_PRODUCTION_URL: "https://user:pass@evil.example.com",
  });

  assert.deepEqual(origins, ["https://fixmate-client-snowy.vercel.app"]);
});
