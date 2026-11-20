import { authClient } from "./auth-client.js";
import { createAccessTokenStore } from "./access-token.js";

async function issueAccessToken() {
  const response = await authClient.token();

  if (response.error) {
    throw new Error("A signed access token could not be obtained.");
  }

  const token = response.data?.token;
  if (typeof token !== "string" || token.trim() === "") {
    throw new Error("A signed access token could not be obtained.");
  }

  return token;
}

const tokenStore = createAccessTokenStore({ tokenProvider: issueAccessToken });

export const getAccessToken = tokenStore.getAccessToken;
export const clearAccessToken = tokenStore.clearAccessToken;
