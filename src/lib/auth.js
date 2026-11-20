import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins/jwt";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";

import {
  deriveApplicationRole,
  isRegistrationRole,
  registrationRoleSchema,
} from "./registration.js";
import { provisionApplicationUser } from "./provisioning-client.js";
import { resolveAuthConfig } from "./test-mode.js";

const authConfig = resolveAuthConfig();
const client = new MongoClient(authConfig.mongodbUri);
const db = client.db(authConfig.databaseName);

const betterAuthConfig = {
  baseURL: authConfig.authOrigin,
  database: mongodbAdapter(db, {
    client,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false,
        returned: true,
      },
      registrationRole: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: true,
        returned: false,
        validator: {
          input: registrationRoleSchema,
        },
      },
    },
  },
  plugins: [
    jwt({
      jwt: {
        issuer: authConfig.authOrigin,
        audience: authConfig.authOrigin,
        // Authorization claims are deliberately omitted. Express re-reads the
        // authoritative application user from MongoDB on every request.
        definePayload: () => ({}),
        getSubject: ({ user }) => user.id,
      },
      jwks: {
        jwksPath: "/jwks",
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (
            user.registrationRole !== undefined &&
            !isRegistrationRole(user.registrationRole)
          ) {
            return false;
          }

          const role = deriveApplicationRole(user.registrationRole);
          return { data: { role, registrationRole: role } };
        },
        after: async (user) => {
          if (!isRegistrationRole(user.role)) {
            throw new Error("Application user role must be customer or technician.");
          }

          await provisionApplicationUser({
            authUserId: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
            role: user.role,
          });
        },
      },
    },
  },
};

if (authConfig.betterAuthSecret !== null) {
  betterAuthConfig.secret = authConfig.betterAuthSecret;
}

export const auth = betterAuth(betterAuthConfig);
