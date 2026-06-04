"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, Shield, UserCircle2 } from "lucide-react";
import { createRecord, getCurrentAuth, updateRecord } from "@/lib/pocketbase/client";
import type { AppRole, RawPocketBaseRecord, UserProfile } from "@/types/database";

type AdminUser = Pick<UserProfile, "id" | "username" | "full_name" | "email" | "role" | "created_at">;

const roleOptions: AppRole[] = ["admin", "editor", "viewer"];

function roleBadgeClass(role: AppRole) {
  if (role === "admin") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (role === "editor") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUserManagement({ users }: { users: AdminUser[] }) {
  const [items, setItems] = useState(users);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const haystack = [user.full_name, user.username, user.email, user.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRole && (!q || haystack.includes(q));
    });
  }, [items, query, roleFilter]);

  async function updateRole(user: AdminUser, role: AppRole) {
    if (role === user.role) return;

    setSavingUserId(user.id);
    setMessage("");

    try {
      const auth = getCurrentAuth();
      await updateRecord<RawPocketBaseRecord & UserProfile>("users", user.id, { role });
      await createRecord("activity_logs", {
        action: "user.role_updated",
        target_collection: "users",
        record_id: user.id,
        record_label: user.email || user.full_name || "User",
        detail: `Role changed from ${user.role} to ${role}`,
        ...(auth?.user.id ? { actor: auth.user.id } : {}),
        created_at: new Date().toISOString(),
      });
      setItems((current) =>
        current.map((item) => (item.id === user.id ? { ...item, role } : item))
      );
      setMessage(`Updated ${user.email || user.full_name || "user"} to ${role}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update user role.");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="surface-panel overflow-hidden rounded-2xl">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/35 px-5 py-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Access Control
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            User & Role Management
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Search users and adjust workspace access without leaving MiniKB.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[220px_150px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as AppRole | "all")}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/50 px-5 py-3 text-sm text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          {message}
        </div>
      )}

      <div className="divide-y divide-slate-800">
        {filteredUsers.length === 0 && (
          <div className="px-5 py-10 text-sm text-slate-400">No users found.</div>
        )}

        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_150px_180px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <UserCircle2 className="h-10 w-10 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {user.full_name || user.username || user.email || "No name"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {user.email || "No email"} - Joined {formatDate(user.created_at)}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <span
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold uppercase ${roleBadgeClass(user.role)}`}
              >
                <Shield className="h-3 w-3" />
                {user.role}
              </span>
            </div>

            <select
              value={user.role}
              disabled={savingUserId === user.id}
              onChange={(event) => updateRole(user, event.target.value as AppRole)}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70 disabled:opacity-50"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {savingUserId === user.id && role === user.role ? "Saving..." : role}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
