import { connection } from "next/server";

import { AUTHORIZATION_HEADER } from "@/lib/bearer-auth.js";
import { createUploadProxyHandler } from "@/lib/upload-proxy.js";

const proxyUpload = createUploadProxyHandler();

export async function POST(request) {
  await connection();

  return proxyUpload({
    method: request.method,
    authorization: request.headers.get(AUTHORIZATION_HEADER),
    body: await request.text(),
  });
}
