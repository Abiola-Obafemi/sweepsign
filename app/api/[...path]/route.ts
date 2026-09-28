import { handleApi } from "../../../lib/api";

async function handle(
  request: Request,
  context: RouteContext<"/api/[...path]">,
) {
  const { path } = await context.params;
  return handleApi(request, path);
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
