import Link from "next/link";
import { headers } from "next/headers";
import { CaptureForm } from "@/client/CaptureForm";

export default async function LandingPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "your-domain";
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const snippet = `<script src="${protocol}://${host}/embed.js" async></script>`;

  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-5">
        <span className="text-sm font-semibold">âš¡ Leadline</span>
        <Link
          href="/login"
          className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash"
        >
          Team sign in
        </Link>
      </header>

      <section className="grid items-start gap-12 py-14 md:grid-cols-2">
        <div>
          <div className="text-5xl">âš¡</div>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight">
            The lead platform for small sales teams.
          </h1>
          <p className="mt-4 text-lg text-sub">
            Capture inquiries anywhere, score them automatically, and walk every lead down a real
            pipeline â€” with an audit trail your whole team can trust.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink">
            <li>ðŸ“‹ Drag-and-drop pipeline board with enforced stage rules</li>
            <li>ðŸ”¥ Automatic lead scoring from value, priority, source, and recency</li>
            <li>ðŸ§¾ Append-only activity trail â€” every change, timestamped, forever</li>
            <li>ðŸ” Admin and member roles, enforced in the UI and the API</li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-6 shadow-[0_1px_10px_rgba(15,15,15,0.04)]">
          <h2 className="text-lg font-semibold">Tell us about your project</h2>
          <p className="mt-1 mb-4 text-sm text-sub">This form feeds the live dashboard â€” try it.</p>
          <CaptureForm />
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="text-2xl font-bold">ðŸ“Ž Embed the form on any website</h2>
        <p className="mt-2 max-w-2xl text-sm text-sub">
          Leadline is a platform, not a page. Drop one script tag on any site â€” a client&apos;s
          WordPress blog, a landing page, a CodePen â€” and every submission lands in this pipeline,
          scored and ready to work.
        </p>
        <pre className="mt-4 max-w-2xl overflow-x-auto rounded-lg border border-line bg-canvas p-4 text-sm">
          {snippet}
        </pre>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="text-2xl font-bold">ðŸ”‘ Reviewing this build?</h2>
        <p className="mt-2 text-sm text-sub">
          Sign in with the demo accounts to see both permission levels in action.
        </p>
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-4 text-sm">
            <div className="font-semibold">Admin â€” Ava Sharma</div>
            <div className="mt-1 text-sub">admin@leadline.demo</div>
            <div className="text-sub">Admin@1234</div>
          </div>
          <div className="rounded-lg border border-line p-4 text-sm">
            <div className="font-semibold">Member â€” Rohan Mehta</div>
            <div className="mt-1 text-sub">member@leadline.demo</div>
            <div className="text-sub">Member@1234</div>
          </div>
        </div>
      </section>
    </main>
  );
}
