import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createAdminPaymentsProxyHandler } from "@/lib/payment-proxy.js";

const proxyAdminPayments = createAdminPaymentsProxyHandler();

export async function GET(request) {
  await connection();

  return proxyAdminPayments({
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    searchParams: new URL(request.url).searchParams,
  });
}
