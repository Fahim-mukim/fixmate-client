import { createServiceManagementApiClient } from "./service-management-api-client.js";
import { getAccessToken } from "./auth-token.js";

export const serviceManagementApi = createServiceManagementApiClient({
  getAccessToken,
});
