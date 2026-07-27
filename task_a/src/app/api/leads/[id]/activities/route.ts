import { json, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";
import { listActivities } from "@/server/leads";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  return json({ data: await listActivities(actor, id) });
});
