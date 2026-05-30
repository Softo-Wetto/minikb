import { Shield, UserCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getRecords } from "@/lib/pocketbase/server";
import type { UserProfile } from "@/types/database";

type AdminUser = Pick<UserProfile, "id" | "full_name" | "email" | "role">;

export default async function AdminPage() {
  await requireAdmin();

  let users: AdminUser[] = [];

  try {
    const { items } = await getRecords<UserProfile>("users", {
      fields: "id,full_name,email,role,created_at",
      sort: "-created_at",
    });
    users = items;
  } catch {
    users = [];
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-800 bg-slate-950/80">
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Review app users and role assignments synced from PocketBase.
          </p>
        </div>

        <div className="divide-y divide-slate-800">
          {users.length === 0 && (
            <div className="px-5 py-10 text-sm text-slate-400">No users found.</div>
          )}

          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserCircle2 className="h-9 w-9 text-slate-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {user.full_name || user.email || "No name"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {user.email || "No email"}
                  </div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-semibold uppercase text-orange-300">
                <Shield className="h-3 w-3" />
                {user.role}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
