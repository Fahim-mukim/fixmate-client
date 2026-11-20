export const APPLICATION_ROLES = Object.freeze(["customer", "technician", "admin"]);

// Registration intent deliberately excludes admin. Admin accounts are never self-service.
export const REGISTRATION_ROLES = Object.freeze(["customer", "technician"]);

export function isRegistrationRole(value) {
  return REGISTRATION_ROLES.includes(value);
}

export function deriveApplicationRole(registrationRole) {
  return isRegistrationRole(registrationRole) ? registrationRole : "customer";
}

export function assertRegistrationRole(value) {
  if (!isRegistrationRole(value)) {
    throw new Error("Choose customer or technician.");
  }
  return value;
}

// Standard Schema-compatible validator used by Better Auth additionalFields.
export const registrationRoleSchema = Object.freeze({
  "~standard": Object.freeze({
    version: 1,
    vendor: "fixmate",
    validate(value) {
      if (isRegistrationRole(value)) {
        return { value };
      }
      return { issues: [{ message: "Role must be customer or technician." }] };
    },
  }),
});
