import {
  createLeadSchema,
  json,
  leadListQuerySchema,
  parseBody,
  parseQuery,
  withErrors,
} from "@/server/http";
import { requireActor } from "@/server/auth";
import { createLead, listLeads } from "@/server/leads";

export const GET = withErrors(async (req) => {
  const actor = await requireActor(req);
  const query = parseQuery(req.url, leadListQuerySchema);
  return json(await listLeads(actor, query));
});

export const POST = withErrors(async (req) => {
  const actor = await requireActor(req);
  const input = await parseBody(req, createLeadSchema);
  return json(await createLead(actor, input), 201);
});
