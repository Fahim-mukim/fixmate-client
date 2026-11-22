import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
function source(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("upload BFF route exposes only POST through the safe proxy", () => {
  const route = source("src/app/api/fixmate/uploads/route.js");

  assert.match(route, /connection\(\)/);
  assert.match(route, /export async function POST/);
  assert.match(route, /createUploadProxyHandler/);
  assert.match(route, /request\.headers\.get\(AUTHORIZATION_HEADER\)/);
  assert.match(route, /await request\.text\(\)/);
  assert.ok(!route.includes("export async function GET"));
  assert.ok(!route.includes("headers.get(\"cookie\")"));
});

test("image upload field provides preview, loading, success, failure, and retry states", () => {
  const field = source("src/components/dashboard/image-upload-field.jsx");

  assert.match(field, /type="file"/);
  assert.match(field, /ACCEPTED_TYPES/);
  assert.match(field, /URL\.createObjectURL\(selected\)/);
  assert.match(field, /photo preview/);
  assert.match(field, /uploadApi\.uploadImage\(purpose, file\)/);
  assert.match(field, /Uploading…/);
  assert.match(field, /Photo uploaded\./);
  assert.match(field, /role=\{status === "error" \? "alert"/);
  assert.match(field, /Retry upload/);
  assert.match(field, /aria-busy=\{uploading\}/);
  assert.match(field, /disabled=\{!file \|\| uploading\}/);
});

test("profile photo upload updates the canonical image without sending image in the PATCH", () => {
  const panel = source("src/components/dashboard/profile-panel.jsx");
  const contract = source("src/lib/profile-contract.js");

  assert.match(panel, /handleProfilePhotoUploaded/);
  assert.match(panel, /normalizeProfile\(/);
  assert.match(panel, /payload\.user && typeof payload\.user === "object"/);
  assert.match(panel, /image: uploadedUrl \?\? payload\.user\.image/);
  assert.match(panel, /Promise\.resolve\(refreshUser\?\.\(\)\)\.catch/);
  assert.match(panel, /profileApi\.updateProfile\(buildProfileUpdateBody\(form\)\)/);
  assert.match(contract, /PROFILE_EDITABLE_FIELDS = Object\.freeze\(\[\s*"name",\s*"phone",\s*"area",\s*"bio",\s*\]\)/);
  assert.match(
    contract,
    /for \(const field of PROFILE_EDITABLE_FIELDS\)[\s\S]{0,180}body\[field\]/,
  );
});
