import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins/jwt";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@better-auth/mongo-adapter";

import {
  deriveApplicationRole,
  isRegistrationRole,
  registrationRoleSchema,
} from "./registration.js";
import { canonicalAuthOrigin } from "./auth-origin.js";

const DEFAULT_DATABASE_NAME = "fixmate";

const mongodbUri = typeof process.env.MONGODB_URI === "string"
  ? process.env.MONGODB_URI.trim()
  : "";
if (!mongodbUri) {
  throw new Error("MONGODB_URI is required.");
}

const authOrigin = canonicalAuthOrigin();
const client = new MongoClient(mongodbUri);
const db = client.db(DEFAULT_DATABASE_NAME);

const betterAuthConfig = {
  baseURL: authOrigin,
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
      phone: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
      area: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
      bio: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  plugins: [
    jwt({
      jwt: {
        issuer: authOrigin,
        audience: authOrigin,
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
      },
    },
  },
};

export const auth = betterAuth(betterAuthConfig);
