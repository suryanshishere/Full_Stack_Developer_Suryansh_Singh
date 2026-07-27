"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass = "rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm";

export function CreateUserForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCreated("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not create the user");
      return;
    }
    setCreated(`${body.user.name} can now sign in with the password you just set.`);
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-canvas p-3"
    >
      <input name="name" required minLength={2} placeholder="Full name" className={inputClass} />
      <input name="email" type="email" required placeholder="Email" className={inputClass} />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Temp password (min 8)"
        className={inputClass}
      />
      <select name="role" defaultValue="MEMBER" className={inputClass}>
        <option value="MEMBER">Member</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50"
      >
        {busy ? "Creating…" : "Add teammate"}
      </button>
      {error && <span className="w-full text-sm text-[#5d1715]">{error}</span>}
      {created && <span className="w-full text-sm text-[#1c3829]">{created}</span>}
    </form>
  );
}

export function ToggleActiveButton({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isSelf) return <span className="text-xs text-faint">you</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await fetch(`/api/users/${userId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isActive: !isActive }),
          });
          setBusy(false);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setError(body.error ?? "Failed");
            return;
          }
          router.refresh();
        }}
        className="rounded-md border border-line px-2 py-1 text-xs hover:bg-wash disabled:opacity-50"
      >
        {isActive ? "Deactivate" : "Reactivate"}
      </button>
      {error && <span className="text-xs text-[#5d1715]">{error}</span>}
    </span>
  );
}
