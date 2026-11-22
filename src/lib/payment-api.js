import { getAccessToken } from "./auth-token.js";
import { createPaymentApiClient } from "./payment-api-client.js";

export const paymentApi = createPaymentApiClient({ getAccessToken });
