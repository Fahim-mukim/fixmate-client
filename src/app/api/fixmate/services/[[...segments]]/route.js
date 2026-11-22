import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createServiceManagementProxyHandler } from "@/lib/service-management-proxy.js";

const proxyServices = createServiceManagementProxyHandler();

async function handle(method, request, context) {
  await connection();

  const { segments } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const body = method === "GET" ? undefined : await request.text();

  return proxyServices({
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

export async function POST(request, context) {
  return handle("POST", request, context);
}

export async function PATCH(request, context) {
  return handle("PATCH", request, context);
}

export async function DELETE(request, context) {
  return handle("DELETE", request, context);
}
