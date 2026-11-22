// These bounds mirror the Server's src/users/profileInput.js.
export const PROFILE_EDITABLE_FIELDS = Object.freeze([
  "name",
  "phone",
  "area",
  "bio",
]);
export const PROFILE_READ_ONLY_FIELDS = Object.freeze([
  "email",
  "role",
  "image",
]);

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;
const PHONE_MIN_LENGTH = 7;
const PHONE_MAX_LENGTH = 25;
const PHONE_MAX_DIGITS = 15;
const AREA_MIN_LENGTH = 2;
const AREA_MAX_LENGTH = 120;
const BIO_MAX_LENGTH = 500;

const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]*$/;
const ALLOWED_FIELDS = new Set(PROFILE_EDITABLE_FIELDS);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function cleanString(value, label, minimum, maximum, { allowEmpty = false } = {}) {
  if (allowEmpty && (value === null || value === undefined)) {
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${label} must be text.` };
  }

  const text = value.trim();
  if (allowEmpty && text === "") return { ok: true, value: "" };
  if (text.length < minimum || text.length > maximum) {
    return {
      ok: false,
      message: `${label} must be between ${minimum} and ${maximum} characters.`,
    };
  }
  return { ok: true, value: text };
}

function parseField(field, value) {
  if (field === "name") {
    return cleanString(value, "Name", NAME_MIN_LENGTH, NAME_MAX_LENGTH);
  }

  if (field === "phone") {
    const result = cleanString(
      value,
      "Phone",
      PHONE_MIN_LENGTH,
      PHONE_MAX_LENGTH,
      { allowEmpty: true },
    );
    if (!result.ok || result.value === "") return result;
    if (!PHONE_PATTERN.test(result.value)) {
      return { ok: false, message: "Phone must contain only phone characters." };
    }
    const digits = result.value.replace(/\D/g, "");
    if (digits.length < PHONE_MIN_LENGTH || digits.length > PHONE_MAX_DIGITS) {
      return { ok: false, message: "Phone must contain 7 to 15 digits." };
    }
    return result;
  }

  if (field === "area") {
    return cleanString(value, "Area", AREA_MIN_LENGTH, AREA_MAX_LENGTH, {
      allowEmpty: true,
    });
  }

  if (field === "bio") {
    return cleanString(value, "Bio", 0, BIO_MAX_LENGTH, { allowEmpty: true });
  }

  return { ok: false, message: `Field "${field}" is not allowed.` };
}

export function validateProfileInput(input = {}) {
  const errors = {};

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { form: "Profile data must be a valid object." };
  }

  const provided = Object.keys(input).filter((key) => ALLOWED_FIELDS.has(key));
  if (provided.length === 0) {
    errors.form = "Change at least one profile field.";
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.form = `Field "${key}" is not allowed.`;
    }
  }

  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (!hasOwn(input, field)) continue;
    const result = parseField(field, input[field]);
    if (!result.ok) errors[field] = result.message;
  }

  return errors;
}

export function buildProfileUpdateBody(input = {}) {
  const errors = validateProfileInput(input);
  const firstError = Object.values(errors)[0];
  if (firstError) throw new Error(firstError);

  const body = {};
  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (hasOwn(input, field)) {
      body[field] = parseField(field, input[field]).value;
    }
  }
  return body;
}

export function profileFormFromUser(profile) {
  return {
    name: typeof profile?.name === "string" ? profile.name : "",
    phone: typeof profile?.phone === "string" ? profile.phone : "",
    area: typeof profile?.area === "string" ? profile.area : "",
    bio: typeof profile?.bio === "string" ? profile.bio : "",
  };
}

export function safeProfileImageUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function profileErrorMessage(payload, fallback) {
  const message = payload?.error?.message;
  return typeof message === "string" && message ? message : fallback;
}
