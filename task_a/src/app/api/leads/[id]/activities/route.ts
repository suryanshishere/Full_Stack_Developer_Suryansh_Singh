import { json, withErrors } from "@/lib/api";
import { requireActor } from "@/lib/auth";
import { listActivities } from "@/lib/leads";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  return json({ data: await listActivities(actor, id) });
});
