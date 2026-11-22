import { createAuthenticatedFetch } from "./authenticated-api.js";
import {
  UPLOAD_PURPOSES,
  buildImageUploadBody,
  readImageFileAsBase64,
  safeUploadedImageUrl,
  validateImageFile,
} from "./image-upload-contract.js";

export const UPLOAD_PROXY_PATH = "/api/fixmate/uploads";

function failure(status, code, message) {
  return { ok: false, status, code, message };
}

async function readResult(response) {
  const payload = await response.json().catch(() => null);

  if (response.ok && payload?.success === true) {
    return { ok: true, data: payload.data };
  }

  return failure(
    response.status,
    typeof payload?.error?.code === "string" ? payload.error.code : "",
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : "Image upload failed.",
  );
}

export function createUploadApiClient({
  getAccessToken,
  authenticatedFetch,
  fetchImpl,
  readImageFile,
} = {}) {
  const requestFetch =
    authenticatedFetch ??
    createAuthenticatedFetch({ getAccessToken, fetchImpl });
  const readFile =
    typeof readImageFile === "function" ? readImageFile : readImageFileAsBase64;

  async function uploadImage(purpose, file) {
    if (!UPLOAD_PURPOSES.includes(purpose)) {
      return failure(400, "INVALID_UPLOAD_REQUEST", "Upload purpose is not supported.");
    }

    const validation = validateImageFile(file);
    if (!validation.ok) {
      return failure(400, "INVALID_IMAGE_FILE", validation.message);
    }

    let body;
    try {
      const imageData = await readFile(file);
      body = buildImageUploadBody({
        purpose,
        fileName: validation.fileName,
        mimeType: validation.mimeType,
        imageData,
      });
    } catch (error) {
      return failure(
        400,
        "INVALID_IMAGE_FILE",
        error instanceof Error && error.message
          ? error.message
          : "The image could not be read.",
      );
    }

    let result;
    try {
      result = await readResult(
        await requestFetch(UPLOAD_PROXY_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    } catch {
      return failure(
        0,
        "CLIENT_REQUEST_FAILED",
        "The image upload could not be sent.",
      );
    }

    if (!result.ok) return result;

    const imageUrl = safeUploadedImageUrl(result.data?.imageUrl);
    if (!imageUrl) {
      return failure(
        502,
        "INVALID_UPLOAD_RESPONSE",
        "The upload response was invalid.",
      );
    }

    return {
      ok: true,
      data: { ...(result.data ?? {}), imageUrl },
    };
  }

  return Object.freeze({ uploadImage });
}
