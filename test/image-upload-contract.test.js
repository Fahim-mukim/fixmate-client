import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_FILE_NAME_LENGTH,
  UPLOAD_PURPOSES,
  buildImageUploadBody,
  readImageFileAsBase64,
  safeUploadedImageUrl,
  validateImageFile,
  validateImageUploadBody,
} from "../src/lib/image-upload-contract.js";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function imageFile(overrides = {}) {
  return {
    name: "photo.png",
    type: "image/png",
    size: 68,
    ...overrides,
  };
}

test("upload contract mirrors the Server's allowed purposes and formats", () => {
  assert.deepEqual(UPLOAD_PURPOSES, ["profile", "service"]);
  assert.deepEqual(ALLOWED_IMAGE_MIME_TYPES, [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]);
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_UPLOAD_FILE_NAME_LENGTH, 120);
});

test("validateImageFile accepts supported files and rejects unsafe ones", () => {
  for (const [type, name] of [
    ["image/jpeg", "photo.jpeg"],
    ["image/png", "photo.png"],
    ["image/webp", "photo.webp"],
    ["image/gif", "photo.gif"],
  ]) {
    const result = validateImageFile(imageFile({ type, name }));
    assert.equal(result.ok, true, `${type} should be accepted`);
    assert.equal(result.mimeType, type);
  }

  const rejected = [
    null,
    imageFile({ type: "image/svg+xml", name: "photo.svg" }),
    imageFile({ type: "image/png", name: "photo.jpg" }),
    imageFile({ name: "../photo.png" }),
    imageFile({ size: 0 }),
    imageFile({ size: MAX_IMAGE_BYTES + 1 }),
  ];
  for (const file of rejected) {
    assert.equal(validateImageFile(file).ok, false);
  }
});

test("upload body builder returns exactly the Server-supported fields", () => {
  const body = buildImageUploadBody({
    purpose: "profile",
    fileName: "photo.png",
    mimeType: "image/png",
    imageData: PNG_BASE64,
  });

  assert.deepEqual(Object.keys(body), [
    "purpose",
    "fileName",
    "mimeType",
    "imageData",
  ]);
  assert.equal(body.imageData, PNG_BASE64);
  assert.equal(Object.isFrozen(body), true);
});

test("upload body validation rejects extra fields and oversized base64", () => {
  const extra = validateImageUploadBody({
    purpose: "service",
    fileName: "photo.png",
    mimeType: "image/png",
    imageData: PNG_BASE64,
    role: "admin",
  });
  assert.equal(extra.ok, false);

  const oversized = validateImageUploadBody({
    purpose: "profile",
    fileName: "photo.png",
    mimeType: "image/png",
    imageData: "A".repeat(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4),
  });
  assert.equal(oversized.ok, false);

  const dataUrl = validateImageUploadBody({
    purpose: "profile",
    fileName: "photo.png",
    mimeType: "image/png",
    imageData: `data:image/png;base64,${PNG_BASE64}`,
  });
  assert.equal(dataUrl.ok, false);
});

test("readImageFileAsBase64 extracts canonical base64 from a data URL", async () => {
  class FakeFileReader {
    readAsDataURL(file) {
      this.result = `data:${file.type};base64,${PNG_BASE64}`;
      this.onload();
    }
  }

  const result = await readImageFileAsBase64(imageFile(), FakeFileReader);
  assert.equal(result, PNG_BASE64);
});

test("safeUploadedImageUrl accepts only trusted HTTPS ImgBB image hosts", () => {
  assert.equal(
    safeUploadedImageUrl("https://i.imgbb.com/photo.png"),
    "https://i.imgbb.com/photo.png",
  );
  assert.equal(
    safeUploadedImageUrl("https://i.ibb.co/w04Prt6/c1f64245afb2.gif"),
    "https://i.ibb.co/w04Prt6/c1f64245afb2.gif",
  );
  assert.equal(safeUploadedImageUrl("http://i.ibb.co/photo.png"), null);
  assert.equal(safeUploadedImageUrl("https://example.com/photo.png"), null);
  assert.equal(safeUploadedImageUrl("https://i.ibb.co.evil.com/photo.png"), null);
  assert.equal(safeUploadedImageUrl("https://evil.i.ibb.co/photo.png"), null);
  assert.equal(safeUploadedImageUrl("https://ibb.co/photo"), null);
  assert.equal(
    safeUploadedImageUrl("https://user:pass@i.ibb.co/photo.png"),
    null,
  );
  assert.equal(safeUploadedImageUrl("https://i.ibb.co:444/photo.png"), null);
  assert.equal(safeUploadedImageUrl("not-a-url"), null);
});
