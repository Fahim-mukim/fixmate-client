import test from "node:test";
import assert from "node:assert/strict";

import {
  PROFILE_EDITABLE_FIELDS,
  PROFILE_READ_ONLY_FIELDS,
  buildProfileUpdateBody,
  profileErrorMessage,
  profileFormFromUser,
  safeProfileImageUrl,
  validateProfileInput,
} from "../src/lib/profile-contract.js";

test("profile contract exposes only the four editable fields", () => {
  assert.deepEqual([...PROFILE_EDITABLE_FIELDS], ["name", "phone", "area", "bio"]);
  assert.deepEqual([...PROFILE_READ_ONLY_FIELDS], ["email", "role", "image"]);
});

test("valid profile input is trimmed and normalized", () => {
  const body = buildProfileUpdateBody({
    name: "  Jane Doe  ",
    phone: " +1 (555) 123-4567 ",
    area: " Dhanmondi ",
    bio: "  Repairs smart devices.  ",
  });

  assert.deepEqual(body, {
    name: "Jane Doe",
    phone: "+1 (555) 123-4567",
    area: "Dhanmondi",
    bio: "Repairs smart devices.",
  });
  assert.deepEqual(validateProfileInput(body), {});
});

test("optional profile fields can be cleared and omitted fields stay omitted", () => {
  assert.deepEqual(
    buildProfileUpdateBody({ phone: null, area: "", bio: undefined }),
    { phone: "", area: "", bio: "" },
  );
  assert.deepEqual(buildProfileUpdateBody({ name: "Jane Doe" }), {
    name: "Jane Doe",
  });
});

test("profile validation rejects invalid, oversized, unknown, and operator fields", () => {
  const invalidInputs = [
    { name: "A" },
    { name: "x".repeat(121) },
    { phone: "not-a-phone" },
    { phone: "1234567890123456" },
    { area: "A" },
    { area: "x".repeat(121) },
    { bio: "x".repeat(501) },
    { email: "new@example.com" },
    { role: "admin" },
    { image: "https://example.com/profile.png" },
    { $set: { name: "Injected" } },
    { "name.$ne": "Injected" },
    { name: { $ne: "Injected" } },
    {},
    [],
  ];

  for (const input of invalidInputs) {
    assert.notDeepEqual(validateProfileInput(input), {}, JSON.stringify(input));
    assert.throws(() => buildProfileUpdateBody(input));
  }
});

test("profile form and image helpers keep read-only data out of writes", () => {
  assert.deepEqual(profileFormFromUser({
    name: "Jane",
    phone: "+15551234567",
    area: "Mirpur",
    bio: "Bio",
    email: "jane@example.com",
    role: "admin",
    image: "https://example.com/jane.png",
  }), {
    name: "Jane",
    phone: "+15551234567",
    area: "Mirpur",
    bio: "Bio",
  });

  assert.equal(
    safeProfileImageUrl(" https://images.example.com/avatar.png "),
    "https://images.example.com/avatar.png",
  );
  assert.equal(safeProfileImageUrl("javascript:alert(1)"), null);
  assert.equal(safeProfileImageUrl("data:image/png;base64,AAAA"), null);
  assert.equal(safeProfileImageUrl(42), null);
  assert.equal(
    profileErrorMessage({ error: { message: "Bad profile data." } }, "Fallback"),
    "Bad profile data.",
  );
  assert.equal(profileErrorMessage({}, "Fallback"), "Fallback");
});
