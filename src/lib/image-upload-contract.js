// These bounds mirror the Server's src/uploads/imageUploadInput.js.
export const UPLOAD_PURPOSES = Object.freeze(["profile", "service"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
export const MAX_UPLOAD_FILE_NAME_LENGTH = 120;
export const ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_BODY_FIELDS = Object.freeze([
  "purpose",
  "fileName",
  "mimeType",
  "imageData",
]);

const EXTENSIONS_BY_MIME = Object.freeze({
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
});

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function extensionOf(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function cleanFileName(value) {
  if (typeof value !== "string") {
    return { ok: false, message: "fileName must be text." };
  }

  const fileName = value.trim();
  if (fileName.length < 1 || fileName.length > MAX_UPLOAD_FILE_NAME_LENGTH) {
    return {
      ok: false,
      message: `File name must be between 1 and ${MAX_UPLOAD_FILE_NAME_LENGTH} characters.`,
    };
  }
  if (/[\\/\u0000]/.test(fileName)) {
    return { ok: false, message: "File name must not contain path characters." };
  }
  return { ok: true, fileName };
}

export function validateImageFile(file) {
  if (!file || typeof file !== "object") {
    return { ok: false, message: "Choose an image to upload." };
  }

  const nameResult = cleanFileName(file.name);
  if (!nameResult.ok) return nameResult;

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { ok: false, message: "Choose a JPG, PNG, WebP, or GIF image." };
  }

  const extension = extensionOf(nameResult.fileName);
  if (!EXTENSIONS_BY_MIME[file.type].includes(extension)) {
    return { ok: false, message: "The file name does not match its image format." };
  }

  if (
    !Number.isInteger(file.size) ||
    file.size <= 0 ||
    file.size > MAX_IMAGE_BYTES
  ) {
    return {
      ok: false,
      message: `Choose an image smaller than ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  return {
    ok: true,
    fileName: nameResult.fileName,
    mimeType: file.type,
    size: file.size,
  };
}

function decodedBase64Length(imageData) {
  const padding = imageData.endsWith("==") ? 2 : imageData.endsWith("=") ? 1 : 0;
  return (imageData.length / 4) * 3 - padding;
}

export function validateImageUploadBody(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Upload data must be a valid object." };
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_BODY_FIELDS.includes(key)) {
      return { ok: false, message: `Field "${key}" is not allowed.` };
    }
  }
  for (const field of ALLOWED_BODY_FIELDS) {
    if (!hasOwn(input, field)) {
      return { ok: false, message: `Field "${field}" is required.` };
    }
  }

  if (!UPLOAD_PURPOSES.includes(input.purpose)) {
    return { ok: false, message: "Upload purpose is not supported." };
  }

  const nameResult = cleanFileName(input.fileName);
  if (!nameResult.ok) return nameResult;

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(input.mimeType)) {
    return { ok: false, message: "Image format is not supported." };
  }
  if (!EXTENSIONS_BY_MIME[input.mimeType].includes(extensionOf(nameResult.fileName))) {
    return { ok: false, message: "The file name does not match its image format." };
  }

  const imageData = input.imageData;
  if (
    typeof imageData !== "string" ||
    imageData.length === 0 ||
    imageData.length > MAX_IMAGE_BASE64_LENGTH ||
    imageData.length % 4 !== 0 ||
    !BASE64_PATTERN.test(imageData) ||
    decodedBase64Length(imageData) > MAX_IMAGE_BYTES
  ) {
    return { ok: false, message: "Image data is invalid or too large." };
  }

  return {
    ok: true,
    body: Object.freeze({
      purpose: input.purpose,
      fileName: nameResult.fileName,
      mimeType: input.mimeType,
      imageData,
    }),
  };
}

export function buildImageUploadBody(input) {
  const result = validateImageUploadBody(input);
  if (!result.ok) throw new Error(result.message);
  return result.body;
}

export function readImageFileAsBase64(file, FileReaderImpl = globalThis.FileReader) {
  return new Promise((resolve, reject) => {
    if (typeof FileReaderImpl !== "function") {
      reject(new Error("This browser cannot read image files."));
      return;
    }

    let reader;
    try {
      reader = new FileReaderImpl();
    } catch {
      reject(new Error("This browser cannot read image files."));
      return;
    }

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("The image could not be read."));
        return;
      }

      const separator = result.indexOf(",");
      if (separator < 0 || !result.slice(0, separator).endsWith(";base64")) {
        reject(new Error("The image could not be read."));
        return;
      }

      resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onabort = () => reject(new Error("The image read was cancelled."));

    try {
      reader.readAsDataURL(file);
    } catch {
      reject(new Error("The image could not be read."));
    }
  });
}

const TRUSTED_IMGBB_IMAGE_HOSTS = new Set(["i.ibb.co", "i.imgbb.com"]);

export function safeUploadedImageUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.port) return null;
  if (!TRUSTED_IMGBB_IMAGE_HOSTS.has(parsed.hostname)) return null;
  return parsed.toString();
}
