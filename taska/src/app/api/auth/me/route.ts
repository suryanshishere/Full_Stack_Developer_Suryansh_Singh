import { json, withErrors } from "@/lib/api";
import { requireActor } from "@/lib/auth";

export const GET = withErrors(async (req) => {
  const actor = await requireActor(req);
  return json({ user: actor });
});
