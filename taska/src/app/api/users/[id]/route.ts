import { json, parseBody, updateUserSchema, withErrors } from "@/lib/api";
import { requireActor, setUserActive } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const { isActive } = await parseBody(req, updateUserSchema);
  return json({ user: await setUserActive(actor, id, isActive) });
});
