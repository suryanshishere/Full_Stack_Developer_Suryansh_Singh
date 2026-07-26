"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const inputClass = "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const next = params.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
      return;
    }
    setSubmitting(false);
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "Login failed");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-sub">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className={inputClass}
          placeholder="you@team.com"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-sub">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className={inputClass}
          placeholder="••••••••"
        />
      </label>
      {error && <p className="text-sm text-[#5d1715]">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setEmail("admin@leadline.demo");
            setPassword("Admin@1234");
          }}
          className="rounded-md border border-line px-2 py-1.5 text-xs text-sub hover:bg-wash"
        >
          Fill admin demo
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail("member@leadline.demo");
            setPassword("Member@1234");
          }}
          className="rounded-md border border-line px-2 py-1.5 text-xs text-sub hover:bg-wash"
        >
          Fill member demo
        </button>
      </div>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-line px-2 py-1 text-xs text-sub hover:bg-wash"
    >
      Log out
    </button>
  );
}
