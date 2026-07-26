"use client";

import { useState } from "react";

type FieldErrors = Record<string, string[]>;

const inputClass =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm placeholder:text-faint";

export function CaptureForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, value]) => String(value).trim() !== "")
    );
    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.status === 201) {
      setDone(true);
      form.reset();
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (body.details) setErrors(body.details);
    setFormError(body.error ?? "Something went wrong. Please try again.");
  }

  if (done) {
    return (
      <div className="rounded-lg border border-line bg-canvas p-8 text-center">
        <div className="text-3xl">✅</div>
        <h3 className="mt-3 text-lg font-semibold">Thanks — we got it!</h3>
        <p className="mt-1 text-sm text-sub">Our team will reach out within one business day.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash"
        >
          Submit another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Name" error={errors.name}>
        <input name="name" required minLength={2} placeholder="Priya Nair" className={inputClass} />
      </Field>
      <Field label="Work email" error={errors.email}>
        <input name="email" type="email" required placeholder="priya@company.com" className={inputClass} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company" error={errors.company}>
          <input name="company" placeholder="Zenkart" className={inputClass} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input name="phone" placeholder="+91 98XXX XXXXX" className={inputClass} />
        </Field>
      </div>
      <Field label="What do you need?" error={errors.message}>
        <textarea
          name="message"
          rows={3}
          placeholder="Tell us about your project…"
          className={inputClass}
        />
      </Field>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {formError && <p className="text-sm text-[#5d1715]">{formError}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Request a callback"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-xs font-medium text-sub">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-[#5d1715]">{error[0]}</span>}
    </label>
  );
}
