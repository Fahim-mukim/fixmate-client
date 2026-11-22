import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createAdminUserProxyHandler } from "@/lib/admin-user-proxy.js";

const proxyAdminUsers = createAdminUserProxyHandler();

async function handle(method, request, context) {
  await connection();

  const { segments } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const body = method === "GET" ? undefined : await request.text();

  return proxyAdminUsers({
    method,
    segments,
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    searchParams,
    body,
  });
}

export async function GET(request, context) {
  return handle("GET", request, context);
}

export async function PATCH(request, context) {
  return handle("PATCH", request, context);
}
