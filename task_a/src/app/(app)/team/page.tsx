import { redirect } from "next/navigation";
import { getPageActor, listUsers } from "@/lib/auth";
import { CreateUserForm, ToggleActiveButton } from "@/components/UserForm";

export const metadata = { title: "Team · Leadline" };

export default async function TeamPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const users = await listUsers(actor);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">👥 Team</h1>
      <p className="mt-1 text-sm text-sub">
        Invite teammates and control access. Deactivated members keep their history but cannot sign
        in, and their leads can be reassigned.
      </p>

      <div className="mt-5">
        <CreateUserForm />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-sub">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Leads</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2.5 font-medium">{user.name}</td>
                <td className="px-3 py-2.5 text-sub">{user.email}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded bg-wash px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sub uppercase">
                    {user.role}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sub">{user.assignedLeadCount}</td>
                <td className="px-3 py-2.5">
                  {user.isActive ? (
                    <span className="rounded bg-[#dbeddb] px-1.5 py-0.5 text-xs font-medium text-[#1c3829]">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-[#ffe2dd] px-1.5 py-0.5 text-xs font-medium text-[#5d1715]">
                      Deactivated
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <ToggleActiveButton
                    userId={user.id}
                    isActive={user.isActive}
                    isSelf={user.id === actor.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
