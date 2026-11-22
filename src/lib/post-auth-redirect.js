// Resolve the destination after a successful email/password authentication.
// The role fallback comes from the authoritative user API, not form state.

import { dashboardHrefForRole } from "./booking-contract.js";
import { nextParamFromSearch, safeReturnPath } from "./return-url.js";

export async function resolvePostAuthPath(search, loadCurrentUser, fallback = "/") {
  const requested = nextParamFromSearch(search);

  if (typeof loadCurrentUser === "function") {
    try {
      const user = await loadCurrentUser();
      const dashboard = dashboardHrefForRole(user?.role);
      // `dashboardHrefForRole` uses /sign-in for unknown roles; never redirect
      // a freshly authenticated user back to the sign-in page.
      const roleFallback = dashboard === "/sign-in" ? fallback : dashboard;
      return safeReturnPath(requested, roleFallback);
    } catch {
      // A missing user API response must not turn into an auth-loop redirect.
    }
  }

  return safeReturnPath(requested, fallback);
}
