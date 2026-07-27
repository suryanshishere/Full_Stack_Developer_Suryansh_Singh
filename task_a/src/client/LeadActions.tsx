"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_META } from "./ui";

type ActionLead = {
  id: string;
  status: string;
  priority: string;
  value: number | null;
  nextFollowUpAt: string | null;
  assignedTo: { id: string; name: string } | null;
};

type LeadActionsProps = {
  lead: ActionLead;
  role: string;
  canMutate: boolean;
  allowedNext: string[];
  users: { id: string; name: string }[];
};

const inputClass = "rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm";

export function LeadActions({ lead, role, canMutate, allowedNext, users }: LeadActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [askingLostReason, setAskingLostReason] = useState(false);
  const [priority, setPriority] = useState(lead.priority);
  const [value, setValue] = useState(lead.value?.toString() ?? "");
  const [followUp, setFollowUp] = useState(lead.nextFollowUpAt?.slice(0, 10) ?? "");
  const [note, setNote] = useState("");

  async function send(path: string, method: string, body: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const allowed = data.details?.allowedNextStatuses as string[] | undefined;
      setError(`${data.error ?? "Request failed"}${allowed?.length ? ` Â· Allowed: ${allowed.join(", ")}` : ""}`);
      return false;
    }
    router.refresh();
    return true;
  }

  async function changeStatus(status: string) {
    if (status === "LOST" && !askingLostReason) {
      setAskingLostReason(true);
      return;
    }
    const ok = await send(`/api/leads/${lead.id}`, "PATCH", {
      status,
      ...(status === "LOST" ? { lostReason } : {}),
    });
    if (ok) {
      setAskingLostReason(false);
      setLostReason("");
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-line bg-canvas p-4">
      {canMutate ? (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-sub uppercase">Move status</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {allowedNext.length === 0 && (
              <span className="text-sm text-faint">
                {role === "ADMIN" ? "No further moves from here." : "This lead is closed â€” only an admin can reopen it."}
              </span>
            )}
            {allowedNext.map((status) => (
              <button
                key={status}
                disabled={busy}
                onClick={() => changeStatus(status)}
                className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm hover:bg-wash disabled:opacity-50"
              >
                {STATUS_META[status]?.emoji} {STATUS_META[status]?.label ?? status}
              </button>
            ))}
          </div>
          {askingLostReason && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                placeholder="Why was this lead lost?"
                className={`${inputClass} min-w-56 flex-1`}
              />
              <button
                disabled={busy || lostReason.trim().length < 2}
                onClick={() => changeStatus("LOST")}
                className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50"
              >
                Mark lost
              </button>
              <button
                onClick={() => setAskingLostReason(false)}
                className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-sub">
          Viewing only â€” this lead is assigned to {lead.assignedTo?.name ?? "no one"}. Only they or an
          admin can modify it.
        </p>
      )}

      {role === "ADMIN" && (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-sub uppercase">Assignee</h3>
          <select
            value={lead.assignedTo?.id ?? ""}
            disabled={busy}
            onChange={(event) =>
              send(`/api/leads/${lead.id}/assign`, "PATCH", {
                assignedToId: event.target.value || null,
              })
            }
            className={`mt-2 w-full max-w-72 ${inputClass}`}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {canMutate && (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-sub uppercase">Properties</h3>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-xs text-sub">
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className={`mt-1 block ${inputClass}`}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="text-xs text-sub">
              Deal value (â‚¹)
              <input
                type="number"
                min={0}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className={`mt-1 block w-32 ${inputClass}`}
              />
            </label>
            <label className="text-xs text-sub">
              Follow-up
              <input
                type="date"
                value={followUp}
                onChange={(event) => setFollowUp(event.target.value)}
                className={`mt-1 block ${inputClass}`}
              />
            </label>
            <button
              disabled={busy}
              onClick={() =>
                send(`/api/leads/${lead.id}`, "PATCH", {
                  priority,
                  value: value === "" ? null : Number(value),
                  nextFollowUpAt: followUp === "" ? null : followUp,
                })
              }
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm hover:bg-wash disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </section>
      )}

      {canMutate && (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-sub uppercase">Add a note</h3>
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Call summary, next steps, anything the team should knowâ€¦"
              className={inputClass}
            />
            <button
              disabled={busy || note.trim().length === 0}
              onClick={async () => {
                const ok = await send(`/api/leads/${lead.id}/notes`, "POST", { body: note.trim() });
                if (ok) setNote("");
              }}
              className="self-start rounded-md bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50"
            >
              Add note
            </button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-[#5d1715]">{error}</p>}
    </div>
  );
}
