"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm";

export function QuickAdd({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignToMe, setAssignToMe] = useState(true);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        ...(data.company ? { company: data.company } : {}),
        ...(data.value ? { value: Number(data.value) } : {}),
        priority: data.priority,
        source: "MANUAL",
        ...(assignToMe ? { assignedToId: userId } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create the lead");
      return;
    }
    form.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90"
      >
        + New lead
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-canvas p-3"
    >
      <input name="name" required minLength={2} placeholder="Name" className={inputClass} />
      <input name="email" type="email" required placeholder="Email" className={inputClass} />
      <input name="company" placeholder="Company" className={inputClass} />
      <input name="value" type="number" min={0} placeholder="Value ₹" className={`w-28 ${inputClass}`} />
      <select name="priority" defaultValue="MEDIUM" className={inputClass}>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>
      <label className="flex items-center gap-1.5 text-xs text-sub">
        <input
          type="checkbox"
          checked={assignToMe}
          onChange={(event) => setAssignToMe(event.target.checked)}
        />
        Assign to me
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash"
      >
        Cancel
      </button>
      {error && <span className="w-full text-sm text-[#5d1715]">{error}</span>}
    </form>
  );
}
