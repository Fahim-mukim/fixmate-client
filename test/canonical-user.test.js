import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authSource = readFileSync(new URL("../src/lib/auth.js", import.meta.url), "utf8");

function additionalFieldBlock(field) {
  const pattern = new RegExp(`${field}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`);
  const match = pattern.exec(authSource);
  assert.ok(match, `${field} additional field is missing`);
  return match[1];
}

test("Better Auth uses the canonical fixmate user collection", () => {
  assert.match(authSource, /const DEFAULT_DATABASE_NAME = "fixmate"/);
  assert.match(authSource, /client\.db\(DEFAULT_DATABASE_NAME\)/);
});

test("canonical user profile fields are present and not client-writable", () => {
  for (const field of ["role", "phone", "area", "bio"]) {
    const block = additionalFieldBlock(field);
    assert.match(block, /type: "string"/);
    assert.match(block, /input: false/);
    assert.match(block, /returned: true/);
  }
});

test("registration cannot create admin and no duplicate user provisioning remains", () => {
  assert.match(authSource, /deriveApplicationRole\(user\.registrationRole\)/);
  assert.doesNotMatch(authSource, /provisionApplicationUser/);
  assert.doesNotMatch(authSource, /FIXMATE_PROVISIONING_SECRET/);
  assert.doesNotMatch(authSource, /create:\s*\{[\s\S]*?after:/);
});

test("JWT issuance contract is unchanged", () => {
  assert.match(authSource, /issuer: authOrigin/);
  assert.match(authSource, /audience: authOrigin/);
  assert.match(authSource, /jwksPath: "\/jwks"/);
  assert.match(authSource, /alg: "EdDSA"/);
  assert.match(authSource, /crv: "Ed25519"/);
  assert.match(authSource, /getSubject: \(\{ user \}\) => user\.id/);
  assert.match(authSource, /definePayload: \(\) => \(\{\}\)/);
});
