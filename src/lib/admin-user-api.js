import { createAdminUserApiClient } from "./admin-user-api-client.js";
import { getAccessToken } from "./auth-token.js";

export const adminUserApi = createAdminUserApiClient({ getAccessToken });
