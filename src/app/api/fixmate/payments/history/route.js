import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createCustomerPaymentHistoryProxyHandler } from "@/lib/payment-proxy.js";

const proxyHistory = createCustomerPaymentHistoryProxyHandler();

export async function GET(request) {
  await connection();

  return proxyHistory({
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    searchParams: new URL(request.url).searchParams,
  });
}
