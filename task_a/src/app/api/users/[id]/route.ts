import { json, parseBody, updateUserSchema, withErrors } from "@/server/http";
import { requireActor, setUserActive } from "@/server/auth";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const { isActive } = await parseBody(req, updateUserSchema);
  return json({ user: await setUserActive(actor, id, isActive) });
});
