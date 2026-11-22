import { createProfileApiClient } from "./profile-api-client.js";
import { getAccessToken } from "./auth-token.js";

export const profileApi = createProfileApiClient({ getAccessToken });
