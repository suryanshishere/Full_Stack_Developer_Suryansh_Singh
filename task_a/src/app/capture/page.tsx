import { CaptureForm } from "@/components/CaptureForm";

export const metadata = { title: "Contact us · Leadline" };

export default function CapturePage() {
  return (
    <main className="mx-auto max-w-lg px-5 py-6">
      <h1 className="text-lg font-semibold">Tell us about your project</h1>
      <p className="mt-1 mb-4 text-sm text-sub">We usually reply within one business day.</p>
      <CaptureForm />
      <p className="mt-4 text-center text-xs text-faint">
        Powered by ⚡ Leadline ·{" "}
        <a
          href="https://digitalheroesco.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Built for Digital Heroes Training Task
        </a>
      </p>
    </main>
  );
}
