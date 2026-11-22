import { createBookingApiClient } from "./booking-api-client.js";
import { getAccessToken } from "./auth-token.js";

export const bookingApi = createBookingApiClient({ getAccessToken });
