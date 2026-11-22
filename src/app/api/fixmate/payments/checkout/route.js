import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createCheckoutProxyHandler } from "@/lib/payment-proxy.js";

const proxyCheckout = createCheckoutProxyHandler();

export async function POST(request) {
  await connection();

  return proxyCheckout({
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    body: await request.text(),
    searchParams: new URL(request.url).searchParams,
  });
}
