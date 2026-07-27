import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageActor } from "@/server/auth";
import { Credit } from "@/client/Credit";
import { BoltIcon, GlobeIcon, ListIcon, UsersIcon } from "@/client/icons";
import { LogoutButton } from "@/client/LoginForm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPageActor();
  if (!actor) redirect("/login");

  const navLink = "flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-wash";

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-canvas md:flex">
        <div className="flex items-center gap-1.5 px-4 pt-4 pb-2 text-sm font-semibold">
          <BoltIcon className="h-4 w-4" />
          Leadline
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-2 text-sm text-ink">
          <Link href="/dashboard" className={navLink}>
            <ListIcon className="h-4 w-4 text-sub" />
            Leads
          </Link>
          {actor.role === "ADMIN" && (
            <Link href="/team" className={navLink}>
              <UsersIcon className="h-4 w-4 text-sub" />
              Team
            </Link>
          )}
          <Link href="/" className={navLink}>
            <GlobeIcon className="h-4 w-4 text-sub" />
            Public site
          </Link>
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <div className="text-xs">
            <div className="font-medium">{actor.name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-faint">
              {actor.email}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="rounded bg-wash px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sub uppercase">
              {actor.role}
            </span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-60">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <BoltIcon className="h-4 w-4" />
            Leadline
          </span>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Leads
            </Link>
            {actor.role === "ADMIN" && (
              <Link href="/team" className="hover:underline">
                Team
              </Link>
            )}
            <LogoutButton />
          </nav>
        </header>
        <main className="flex-1 px-5 py-7 md:px-8">{children}</main>
        <Credit />
      </div>
    </div>
  );
}
