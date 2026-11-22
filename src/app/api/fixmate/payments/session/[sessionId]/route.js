import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createSessionProxyHandler } from "@/lib/payment-proxy.js";

const proxySession = createSessionProxyHandler();

export async function GET(request, context) {
  await connection();

  const { sessionId } = await context.params;

  return proxySession({
    sessionId,
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    searchParams: new URL(request.url).searchParams,
  });
}
