"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  PriorityBadge,
  ScoreChip,
  OverdueBadge,
  STATUS_KEYS,
  STATUS_META,
  formatMoney,
  isOverdue,
} from "./badges";

export type BoardLead = {
  id: string;
  name: string;
  company: string | null;
  status: string;
  priority: string;
  score: number;
  value: number | null;
  nextFollowUpAt: string | null;
  assignedTo: { id: string; name: string } | null;
};

type BoardProps = {
  leads: BoardLead[];
  role: string;
  userId: string;
  transitions: Record<string, string[]>;
};

export function Board({ leads, role, userId, transitions }: BoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(leads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setItems(leads), [leads]);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }

  function canDrag(lead: BoardLead) {
    const mayMutate = role === "ADMIN" || lead.assignedTo?.id === userId;
    return mayMutate && (transitions[lead.status] ?? []).length > 0;
  }

  const draggingLead = items.find((lead) => lead.id === draggingId) ?? null;

  async function moveLead(lead: BoardLead, to: string) {
    if (lead.status === to) return;
    let lostReason: string | undefined;
    if (to === "LOST") {
      lostReason = window.prompt("Why was this lead lost?")?.trim();
      if (!lostReason) return;
    }
    const previous = items;
    setItems(previous.map((item) => (item.id === lead.id ? { ...item, status: to } : item)));
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to, ...(lostReason ? { lostReason } : {}) }),
    });
    if (!res.ok) {
      setItems(previous);
      const body = await res.json().catch(() => ({}));
      const allowed = body.details?.allowedNextStatuses as string[] | undefined;
      showToast(
        `${body.error ?? "Move failed"}${allowed?.length ? ` · Allowed next: ${allowed.join(", ")}` : ""}`
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUS_KEYS.map((status) => {
          const meta = STATUS_META[status];
          const columnLeads = items
            .filter((lead) => lead.status === status)
            .sort((a, b) => b.score - a.score);
          const columnValue = columnLeads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);
          const isLegalTarget =
            draggingLead !== null &&
            draggingLead.status !== status &&
            (transitions[draggingLead.status] ?? []).includes(status);
          return (
            <div
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                const lead = items.find((item) => item.id === id);
                setDraggingId(null);
                if (lead) moveLead(lead, status);
              }}
              className={`flex w-64 shrink-0 flex-col rounded-lg border bg-canvas transition-colors ${
                isLegalTarget ? "border-accent" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-medium">
                  {meta.emoji} {meta.label}
                  <span className="ml-1.5 text-xs text-faint">{columnLeads.length}</span>
                </span>
                <span className="text-xs text-faint">{columnValue ? formatMoney(columnValue) : ""}</span>
              </div>
              <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {columnLeads.map((lead) => {
                  const draggable = canDrag(lead);
                  return (
                    <div
                      key={lead.id}
                      draggable={draggable}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", lead.id);
                        setDraggingId(lead.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      title={
                        draggable
                          ? "Drag to change status"
                          : "Only the assigned member or an admin can move this lead"
                      }
                      className={`rounded-md border border-line bg-paper p-2.5 shadow-[0_1px_2px_rgba(15,15,15,0.04)] ${
                        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-90"
                      } ${draggingId === lead.id ? "opacity-50" : ""}`}
                    >
                      <Link href={`/leads/${lead.id}`} className="block text-sm font-medium hover:underline">
                        {lead.name}
                      </Link>
                      {lead.company && <div className="mt-0.5 text-xs text-sub">{lead.company}</div>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PriorityBadge priority={lead.priority} />
                        <ScoreChip score={lead.score} />
                        {isOverdue(lead.nextFollowUpAt, lead.status) && <OverdueBadge />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-sub">
                        <span>{lead.value ? formatMoney(lead.value) : ""}</span>
                        {lead.assignedTo ? (
                          <span
                            title={`Assigned to ${lead.assignedTo.name}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-wash text-[10px] font-semibold"
                          >
                            {initials(lead.assignedTo.name)}
                          </span>
                        ) : (
                          <span className="text-faint">unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {columnLeads.length === 0 && (
                  <div className="rounded-md border border-dashed border-line px-2 py-4 text-center text-xs text-faint">
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border border-line bg-ink px-4 py-2 text-sm text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
