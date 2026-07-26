import { json, parseBody, publicLeadSchema, withErrors } from "@/lib/api";
import { createPublicLead } from "@/lib/leads";

export const POST = withErrors(async (req) => {
  const input = await parseBody(req, publicLeadSchema);
  if (input.website) return json({ ok: true }, 201);
  const lead = await createPublicLead(input);
  return json({ ok: true, id: lead.id }, 201);
});
