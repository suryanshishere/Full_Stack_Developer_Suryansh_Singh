import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeftIcon, BoltIcon } from "@/client/icons";
import { LoginForm } from "@/client/LoginForm";

export const metadata = { title: "Sign in · Leadline" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-sub hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to site
        </Link>
        <div className="mt-4 rounded-xl border border-line bg-canvas p-6 shadow-[0_1px_10px_rgba(15,15,15,0.04)]">
          <BoltIcon className="h-7 w-7" />
          <h1 className="mt-2 text-xl font-bold">Sign in to Leadline</h1>
          <p className="mt-1 mb-5 text-sm text-sub">Use a demo account or your own credentials.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
