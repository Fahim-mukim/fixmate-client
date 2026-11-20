export const PROVISIONING_SECRET_HEADER = "x-fixmate-provisioning-secret";
const PROVISIONING_PATH = "/api/internal/users";

function resolveEndpoint() {
  const configured = process.env.FIXMATE_SERVER_API_URL;
  if (typeof configured !== "string" || configured.trim() === "") {
    throw new Error("FIXMATE_SERVER_API_URL is not configured.");
  }

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("FIXMATE_SERVER_API_URL must be a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("FIXMATE_SERVER_API_URL must use http or https.");
  }

  return new URL(PROVISIONING_PATH, url).toString();
}

function resolveSecret() {
  const configured = process.env.FIXMATE_PROVISIONING_SECRET;
  if (typeof configured !== "string" || configured.length === 0) {
    throw new Error("FIXMATE_PROVISIONING_SECRET is not configured.");
  }
  return configured;
}

export function createProvisioningClient({
  endpoint,
  secret,
  fetchImpl = fetch,
  headerName = PROVISIONING_SECRET_HEADER,
} = {}) {
  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    throw new Error("Provisioning endpoint is required.");
  }
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("Provisioning secret is required.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Provisioning fetch implementation is required.");
  }

  return async function provisionApplicationUser(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Provisioning input must be an object.");
    }

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [headerName]: secret,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Application user provisioning failed (${response.status}).`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error("Application user provisioning returned an invalid response.");
    }
  };
}

export function provisionApplicationUser(input) {
  return createProvisioningClient({
    endpoint: resolveEndpoint(),
    secret: resolveSecret(),
  })(input);
}
