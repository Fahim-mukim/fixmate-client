import { getAccessToken } from "./auth-token.js";
import { createUploadApiClient } from "./upload-api-client.js";

export const uploadApi = createUploadApiClient({ getAccessToken });
