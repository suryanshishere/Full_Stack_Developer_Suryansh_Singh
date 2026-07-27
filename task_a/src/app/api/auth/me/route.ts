import { json, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";

export const GET = withErrors(async (req) => {
  const actor = await requireActor(req);
  return json({ user: actor });
});
