import { leadListQuerySchema, parseQuery, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";
import { exportLeadsCsv } from "@/server/leads";

export const GET = withErrors(async (req) => {
  const actor = await requireActor(req);
  const query = parseQuery(req.url, leadListQuerySchema);
  const csv = await exportLeadsCsv(actor, query);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads.csv"',
    },
  });
});
