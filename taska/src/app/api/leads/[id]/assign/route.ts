import { assignLeadSchema, json, parseBody, withErrors } from "@/lib/api";
import { requireActor } from "@/lib/auth";
import { assignLead } from "@/lib/leads";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const { assignedToId } = await parseBody(req, assignLeadSchema);
  return json(await assignLead(actor, id, assignedToId));
});
