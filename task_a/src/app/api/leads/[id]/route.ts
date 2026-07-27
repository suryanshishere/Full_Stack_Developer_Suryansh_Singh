import { json, parseBody, updateLeadSchema, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";
import { deleteLead, getLead, updateLead } from "@/server/leads";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  return json(await getLead(actor, id));
});

export const PATCH = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const input = await parseBody(req, updateLeadSchema);
  return json(await updateLead(actor, id, input));
});

export const DELETE = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  await deleteLead(actor, id);
  return new Response(null, { status: 204 });
});
