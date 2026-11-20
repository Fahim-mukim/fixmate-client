import test from "node:test";
import assert from "node:assert/strict";

import {
  REGISTRATION_ROLES,
  assertRegistrationRole,
  deriveApplicationRole,
  isRegistrationRole,
  registrationRoleSchema,
} from "../src/lib/registration.js";

test("registration allows only customer and technician intents", () => {
  assert.deepEqual(REGISTRATION_ROLES, ["customer", "technician"]);
  assert.equal(isRegistrationRole("customer"), true);
  assert.equal(isRegistrationRole("technician"), true);
  assert.equal(isRegistrationRole("admin"), false);
  assert.equal(isRegistrationRole(undefined), false);
});

test("admin self-registration is rejected and fallback stays customer", () => {
  assert.throws(() => assertRegistrationRole("admin"), /customer or technician/);
  assert.equal(assertRegistrationRole("technician"), "technician");
  assert.equal(deriveApplicationRole("technician"), "technician");
  assert.equal(deriveApplicationRole(undefined), "customer");
  assert.equal(deriveApplicationRole("admin"), "customer");
});

test("registrationRoleSchema is a synchronous Standard Schema validator", () => {
  assert.deepEqual(registrationRoleSchema["~standard"].validate("customer"), {
    value: "customer",
  });
  assert.equal(
    registrationRoleSchema["~standard"].validate("admin").issues.length,
    1,
  );
});
