export function createAccessTokenStore({ tokenProvider } = {}) {
  if (typeof tokenProvider !== "function") {
    throw new Error("tokenProvider is required.");
  }

  let token = null;
  let pending = null;

  async function getAccessToken() {
    if (typeof token === "string" && token.length > 0) return token;
    if (pending) return pending;

    pending = (async () => {
      const issued = await tokenProvider();
      if (typeof issued !== "string" || issued.length === 0) {
        throw new Error("A valid access token could not be obtained.");
      }
      token = issued;
      return token;
    })();

    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  function clearAccessToken() {
    token = null;
  }

  return Object.freeze({ getAccessToken, clearAccessToken });
}
