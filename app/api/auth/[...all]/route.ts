import { toNextJsHandler } from "better-auth/next-js";
import { assertAuthEnvironment, auth } from "../../../../lib/auth";
import { ensureSchema } from "../../../../lib/db";

const handler = toNextJsHandler(auth);
async function ready(request: Request, method: keyof typeof handler) {
  assertAuthEnvironment();
  await ensureSchema();
  return handler[method](request);
}
export const GET = (request: Request) => ready(request, "GET");
export const POST = (request: Request) => ready(request, "POST");
