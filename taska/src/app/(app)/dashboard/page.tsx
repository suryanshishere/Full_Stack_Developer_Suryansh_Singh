import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageActor } from "@/lib/auth";
import { allowedTransitions, listLeads, statusCounts } from "@/lib/leads";
import { leadListQuerySchema, STATUSES, type LeadListQuery, type LeadStatus } from "@/lib/api";
import { Board, type BoardLead } from "@/components/Board";
import { LiveToast } from "@/components/LiveToast";
import { QuickAdd } from "@/components/QuickAdd";
import {
  OverdueBadge,
  PriorityBadge,
  ScoreChip,
  STATUS_META,
  StatusBadge,
  formatMoney,
  isOverdue,
  shortDate,
  timeAgo,
} from "@/components/badges";

export const metadata = { title: "Leads · Leadline" };

type Search = Record<string, string | string[] | undefined>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await getPageActor();
  if (!actor) redirect("/login");

  const raw = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) flat[key] = first;
  }
  const parsed = leadListQuerySchema.safeParse(flat);
  const query: LeadListQuery = parsed.success ? parsed.data : leadListQuerySchema.parse({});
  const view = flat.view === "table" ? "table" : "board";
  const listQuery: LeadListQuery = view === "board" ? { ...query, page: 1, pageSize: 100 } : query;

  const [counts, result] = await Promise.all([statusCounts(), listLeads(actor, listQuery)]);
  const totalAll = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const transitions: Record<string, string[]> = {};
  for (const status of STATUSES) transitions[status] = allowedTransitions(status as LeadStatus, actor.role);

  const boardLeads: BoardLead[] = result.data.map((lead) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    status: lead.status,
    priority: lead.priority,
    score: lead.score,
    value: lead.value,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    assignedTo: lead.assignedTo,
  }));

  function href(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = { ...flat, page: undefined, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  const exportParams = new URLSearchParams();
  for (const key of ["status", "priority", "assignedTo", "q", "sort", "order"] as const) {
    if (flat[key]) exportParams.set(key, flat[key]);
  }
  const exportHref = `/api/leads/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  const chip = (active: boolean) =>
    `rounded-md border px-2.5 py-1 text-xs transition-colors ${
      active ? "border-ink bg-ink text-paper" : "border-line text-sub hover:bg-wash"
    }`;

  const sortOptions = [
    { label: "Newest", sort: "createdAt", order: "desc" },
    { label: "🔥 Hottest", sort: "score", order: "desc" },
    { label: "Biggest", sort: "value", order: "desc" },
    { label: "Stalest", sort: "lastActivityAt", order: "asc" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📋 Leads</h1>
          <p className="mt-1 text-sm text-sub">
            {totalAll} in pipeline · {counts.WON ?? 0} won · {counts.LOST ?? 0} lost
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportHref} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash">
            ⬇️ CSV
          </a>
          <QuickAdd userId={actor.id} />
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={href({ status: undefined })} className={chip(!query.status)}>
            All {totalAll}
          </Link>
          {STATUSES.map((status) => (
            <Link key={status} href={href({ status })} className={chip(query.status === status)}>
              {STATUS_META[status].emoji} {STATUS_META[status].label} {counts[status] ?? 0}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Link href={href({ assignedTo: undefined })} className={chip(!query.assignedTo)}>
              Everyone
            </Link>
            <Link href={href({ assignedTo: actor.id })} className={chip(query.assignedTo === actor.id)}>
              Mine
            </Link>
            <Link
              href={href({ assignedTo: "unassigned" })}
              className={chip(query.assignedTo === "unassigned")}
            >
              Unassigned
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            {["HIGH", "MEDIUM", "LOW"].map((priority) => (
              <Link
                key={priority}
                href={href({ priority: query.priority === priority ? undefined : priority })}
                className={chip(query.priority === priority)}
              >
                {priority.toLowerCase()}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {sortOptions.map((option) => (
              <Link
                key={option.label}
                href={href({ sort: option.sort, order: option.order })}
                className={chip(query.sort === option.sort && query.order === option.order)}
              >
                {option.label}
              </Link>
            ))}
          </div>
          <form action="/dashboard" method="get" className="flex items-center gap-1.5">
            {Object.entries(flat)
              .filter(([key]) => !["q", "page"].includes(key))
              .map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
            <input
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="Search name, email, company…"
              className="w-56 rounded-md border border-line bg-paper px-2.5 py-1 text-xs"
            />
          </form>
          <div className="ml-auto flex items-center rounded-md border border-line p-0.5 text-xs">
            <Link
              href={href({ view: undefined, page: undefined })}
              className={`rounded px-2 py-1 ${view === "board" ? "bg-wash font-medium" : "text-sub"}`}
            >
              Board
            </Link>
            <Link
              href={href({ view: "table", page: undefined })}
              className={`rounded px-2 py-1 ${view === "table" ? "bg-wash font-medium" : "text-sub"}`}
            >
              Table
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {totalAll === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-12 text-center">
            <div className="text-3xl">🌱</div>
            <h2 className="mt-3 font-semibold">No leads yet</h2>
            <p className="mt-1 text-sm text-sub">
              Share the <Link href="/" className="underline">capture form</Link> or add one manually to
              get started.
            </p>
          </div>
        ) : view === "board" ? (
          <Board leads={boardLeads} role={actor.role} userId={actor.id} transitions={transitions} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-left text-xs text-sub">
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">Last activity</th>
                  <th className="px-3 py-2 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((lead) => (
                  <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.name}
                      </Link>
                      <div className="text-xs text-sub">{lead.company ?? lead.email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreChip score={lead.score} />
                    </td>
                    <td className="px-3 py-2.5">{formatMoney(lead.value)}</td>
                    <td className="px-3 py-2.5 text-sub">{lead.assignedTo?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-sub">{timeAgo(lead.lastActivityAt)}</td>
                    <td className="px-3 py-2.5">
                      {isOverdue(lead.nextFollowUpAt, lead.status) ? (
                        <OverdueBadge />
                      ) : (
                        <span className="text-sub">{shortDate(lead.nextFollowUpAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-sub">
                      No leads match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {view === "table" && result.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-sub">
            Page {result.meta.page} of {result.meta.totalPages} · {result.meta.total} leads
          </span>
          <div className="flex gap-2">
            {result.meta.page > 1 && (
              <Link
                href={href({ view: "table", page: String(result.meta.page - 1) })}
                className="rounded-md border border-line px-3 py-1.5 hover:bg-wash"
              >
                ← Prev
              </Link>
            )}
            {result.meta.page < result.meta.totalPages && (
              <Link
                href={href({ view: "table", page: String(result.meta.page + 1) })}
                className="rounded-md border border-line px-3 py-1.5 hover:bg-wash"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}

      <LiveToast />
    </div>
  );
}
