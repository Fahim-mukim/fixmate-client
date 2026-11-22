import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createAdminUserProxyHandler } from "@/lib/admin-user-proxy.js";

const proxyAdminUsers = createAdminUserProxyHandler();

async function handle(request, context) {
  await connection();

  const { segments } = await context.params;
  const searchParams = new URL(request.url).searchParams;

  return proxyAdminUsers({
    method: "GET",
    segments,
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    searchParams,
  });
}

export async function GET(request, context) {
  return handle(request, context);
}
