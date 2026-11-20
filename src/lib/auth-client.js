import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

// Single canonical browser client. It uses the same-origin Better Auth API route,
// so no public URL or private credential is embedded in browser code.
export const authClient = createAuthClient({
  plugins: [
    jwtClient({
      jwks: { jwksPath: "/jwks" },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
