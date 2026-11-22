// One established sign-out lifecycle shared by the navbar and dashboard.
// Better Auth owns session invalidation; this helper only clears local,
// in-memory Client state after Better Auth succeeds.

import { authClient } from "./auth-client.js";
import { clearAccessToken } from "./auth-token.js";
import { clearSessionIdentity } from "./session-identity-store.js";

export async function signOutCurrentSession() {
  await authClient.signOut();
  clearAccessToken();
  clearSessionIdentity();
}
