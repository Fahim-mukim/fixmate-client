import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createProfileProxyHandler } from "@/lib/profile-proxy.js";

const proxyProfile = createProfileProxyHandler();

async function handle(method, request) {
  await connection();

  return proxyProfile({
    method,
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    body: method === "GET" ? undefined : await request.text(),
  });
}

export async function GET(request) {
  return handle("GET", request);
}

export async function PATCH(request) {
  return handle("PATCH", request);
}
