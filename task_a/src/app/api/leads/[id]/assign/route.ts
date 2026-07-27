import { assignLeadSchema, json, parseBody, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";
import { assignLead } from "@/server/leads";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const { assignedToId } = await parseBody(req, assignLeadSchema);
  return json(await assignLead(actor, id, assignedToId));
});
