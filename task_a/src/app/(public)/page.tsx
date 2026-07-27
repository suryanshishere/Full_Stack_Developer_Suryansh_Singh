import Link from "next/link";
import { headers } from "next/headers";
import { CaptureForm } from "@/client/CaptureForm";
import {
  BoardIcon,
  BoltIcon,
  CodeIcon,
  GaugeIcon,
  HistoryIcon,
  type Icon,
  KeyIcon,
  ShieldIcon,
} from "@/client/icons";

const features: { Icon: Icon; text: string }[] = [
  { Icon: BoardIcon, text: "Drag-and-drop pipeline board with enforced stage rules" },
  { Icon: GaugeIcon, text: "Automatic lead scoring from value, priority, source, and recency" },
  { Icon: HistoryIcon, text: "Append-only activity trail — every change, timestamped, forever" },
  { Icon: ShieldIcon, text: "Admin and member roles, enforced in the UI and the API" },
];

export default async function LandingPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "your-domain";
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const snippet = `<script src="${protocol}://${host}/embed.js" async></script>`;

  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex items-center justify-between py-5">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <BoltIcon className="h-4 w-4" />
          Leadline
        </span>
        <Link
          href="/login"
          className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-wash"
        >
          Team sign in
        </Link>
      </header>

      <section className="grid items-start gap-12 py-14 md:grid-cols-2">
        <div>
          <BoltIcon className="h-10 w-10" />
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight">
            The lead platform for small sales teams.
          </h1>
          <p className="mt-4 text-lg text-sub">
            Capture inquiries anywhere, score them automatically, and walk every lead down a real
            pipeline — with an audit trail your whole team can trust.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink">
            {features.map(({ Icon: FeatureIcon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <FeatureIcon className="mt-0.5 h-4 w-4 text-sub" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-6 shadow-[0_1px_10px_rgba(15,15,15,0.04)]">
          <h2 className="text-lg font-semibold">Tell us about your project</h2>
          <p className="mt-1 mb-4 text-sm text-sub">This form feeds the live dashboard — try it.</p>
          <CaptureForm />
        </div>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold">
          <CodeIcon className="h-6 w-6 text-sub" strokeWidth={1.5} />
          Embed the form on any website
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-sub">
          Leadline is a platform, not a page. Drop one script tag on any site — a client&apos;s
          WordPress blog, a landing page, a CodePen — and every submission lands in this pipeline,
          scored and ready to work.
        </p>
        <pre className="mt-4 max-w-2xl overflow-x-auto rounded-lg border border-line bg-canvas p-4 text-sm">
          {snippet}
        </pre>
      </section>

      <section className="border-t border-line py-14">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold">
          <KeyIcon className="h-6 w-6 text-sub" strokeWidth={1.5} />
          Reviewing this build?
        </h2>
        <p className="mt-2 text-sm text-sub">
          Sign in with the demo accounts to see both permission levels in action.
        </p>
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-4 text-sm">
            <div className="font-semibold">Admin — Ava Sharma</div>
            <div className="mt-1 text-sub">admin@leadline.demo</div>
            <div className="text-sub">Admin@1234</div>
          </div>
          <div className="rounded-lg border border-line p-4 text-sm">
            <div className="font-semibold">Member — Rohan Mehta</div>
            <div className="mt-1 text-sub">member@leadline.demo</div>
            <div className="text-sub">Member@1234</div>
          </div>
        </div>
      </section>
    </main>
  );
}
