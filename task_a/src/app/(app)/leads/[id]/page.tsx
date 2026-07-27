import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPageActor, listUsers } from "@/server/auth";
import { getLead, listActivities } from "@/server/leads";
import { allowedTransitions } from "@/server/pipeline";
import type { LeadStatus } from "@/server/http";
import { LeadActions } from "@/client/LeadActions";
import {
  OverdueBadge,
  PriorityBadge,
  ScoreChip,
  StatusBadge,
  formatMoney,
  isOverdue,
  shortDate,
  timeAgo,
} from "@/client/ui";

export const metadata = { title: "Lead · Leadline" };

type ActivityRow = {
  id: string;
  type: string;
  createdAt: Date;
  meta: Record<string, unknown>;
  actor: { id: string; name: string } | null;
};

function activityLine(activity: ActivityRow) {
  const meta = activity.meta as Record<string, string | string[] | null | undefined>;
  switch (activity.type) {
    case "LEAD_CREATED":
      return {
        icon: "✨",
        text:
          meta.source === "WEB_FORM"
            ? "captured this lead from the website form"
            : `created this lead (${String(meta.source ?? "manual").toLowerCase()})`,
      };
    case "ASSIGNED":
      return { icon: "👤", text: `assigned this lead to ${meta.toUserName ?? "a teammate"}` };
    case "UNASSIGNED":
      return { icon: "🚫", text: "unassigned this lead" };
    case "STATUS_CHANGED":
      return {
        icon: "🔁",
        text: `moved ${meta.from} → ${meta.to}${meta.lostReason ? ` · “${meta.lostReason}”` : ""}`,
      };
    case "NOTE_ADDED":
      return { icon: "📝", text: "added a note" };
    case "LEAD_UPDATED":
      return {
        icon: "✏️",
        text: `updated ${Array.isArray(meta.changed) ? meta.changed.join(", ") : "properties"}`,
      };
    default:
      return { icon: "•", text: activity.type.toLowerCase() };
  }
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getPageActor();
  if (!actor) redirect("/login");
  const { id } = await params;

  let lead: Awaited<ReturnType<typeof getLead>>;
  try {
    lead = await getLead(actor, id);
  } catch {
    notFound();
  }
  const activities = (await listActivities(actor, id)) as ActivityRow[];
  const users =
    actor.role === "ADMIN"
      ? (await listUsers(actor))
          .filter((user) => user.isActive)
          .map((user) => ({ id: user.id, name: user.name }))
      : [];
  const canMutate = actor.role === "ADMIN" || lead.assignedToId === actor.id;
  const allowedNext = allowedTransitions(lead.status as LeadStatus, actor.role);

  const properties: { label: string; content: React.ReactNode }[] = [
    { label: "Status", content: <StatusBadge status={lead.status} /> },
    { label: "Assignee", content: lead.assignedTo?.name ?? <span className="text-faint">Unassigned</span> },
    { label: "Priority", content: <PriorityBadge priority={lead.priority} /> },
    { label: "Score", content: <ScoreChip score={lead.score} /> },
    { label: "Deal value", content: formatMoney(lead.value) },
    { label: "Source", content: lead.source.replace("_", " ").toLowerCase() },
    {
      label: "Follow-up",
      content: isOverdue(lead.nextFollowUpAt, lead.status) ? (
        <span className="inline-flex items-center gap-1.5">
          <OverdueBadge /> {shortDate(lead.nextFollowUpAt)}
        </span>
      ) : (
        shortDate(lead.nextFollowUpAt)
      ),
    },
    { label: "Email", content: <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a> },
    { label: "Phone", content: lead.phone ?? "—" },
    { label: "Created", content: shortDate(lead.createdAt) },
    { label: "Last activity", content: timeAgo(lead.lastActivityAt) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-sub hover:text-ink">
        ← Leads
      </Link>

      <div className="mt-4">
        <div className="text-4xl">📇</div>
        <h1 className="mt-2 text-3xl font-bold">{lead.name}</h1>
        {lead.company && <p className="mt-1 text-sub">{lead.company}</p>}
        {lead.status === "LOST" && lead.lostReason && (
          <p className="mt-2 text-sm text-[#5d1715]">Lost: {lead.lostReason}</p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2.5 border-y border-line py-4 text-sm sm:grid-cols-2">
        {properties.map((property) => (
          <div key={property.label} className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-sub">{property.label}</dt>
            <dd>{property.content}</dd>
          </div>
        ))}
      </dl>

      {lead.message && (
        <blockquote className="mt-5 rounded-lg border border-line bg-canvas p-4 text-sm text-ink">
          💬 “{lead.message}”
        </blockquote>
      )}

      <div className="mt-6">
        <LeadActions
          lead={{
            id: lead.id,
            status: lead.status,
            priority: lead.priority,
            value: lead.value,
            nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
            assignedTo: lead.assignedTo,
          }}
          role={actor.role}
          canMutate={canMutate}
          allowedNext={allowedNext}
          users={users}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">📝 Notes</h2>
        <div className="mt-3 space-y-3">
          {lead.notes.length === 0 && <p className="text-sm text-faint">No notes yet.</p>}
          {lead.notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-line p-3.5">
              <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              <p className="mt-2 text-xs text-faint">
                {note.author.name} · {timeAgo(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 mb-4">
        <h2 className="text-lg font-semibold">🧾 Activity</h2>
        <ol className="mt-3 space-y-0">
          {activities.map((activity, index) => {
            const line = activityLine(activity);
            return (
              <li key={activity.id} className="relative flex gap-3 pb-4">
                {index < activities.length - 1 && (
                  <span className="absolute top-6 left-[11px] h-full w-px bg-line" />
                )}
                <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xs">
                  {line.icon}
                </span>
                <div className="text-sm">
                  <span className="font-medium">{activity.actor?.name ?? "Website visitor"}</span>{" "}
                  <span className="text-sub">{line.text}</span>
                  <span className="ml-2 text-xs text-faint">{timeAgo(activity.createdAt)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
