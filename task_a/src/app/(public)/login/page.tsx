import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/client/LoginForm";

export const metadata = { title: "Sign in Â· Leadline" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-sub hover:text-ink">
          â† Back to site
        </Link>
        <div className="mt-4 rounded-xl border border-line bg-canvas p-6 shadow-[0_1px_10px_rgba(15,15,15,0.04)]">
          <div className="text-3xl">âš¡</div>
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
