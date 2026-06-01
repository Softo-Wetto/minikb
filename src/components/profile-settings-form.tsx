"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  CheckCircle2,
  IdCard,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  changeCurrentUserPassword,
  updateCurrentUser,
} from "@/lib/pocketbase/client";
import type { UserProfile } from "@/types/database";

export default function ProfileSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [username, setUsername] = useState(profile.username || "");
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"idle" | "success" | "error">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileStatus("idle");
    setMessage("");

    try {
      await updateCurrentUser({
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        email: email.trim() || null,
      });
      setProfileStatus("success");
      setMessage("Profile updated.");
      router.refresh();
    } catch (error) {
      setProfileStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordStatus("idle");
    setMessage("");

    if (password.length < 8) {
      setPasswordStatus("error");
      setMessage("New password must be at least 8 characters.");
      setSavingPassword(false);
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordStatus("error");
      setMessage("New password and confirmation do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      await changeCurrentUserPassword({
        oldPassword,
        password,
        passwordConfirm,
      });
      setPasswordStatus("success");
      setMessage("Password changed.");
      setOldPassword("");
      setPassword("");
      setPasswordConfirm("");
    } catch (error) {
      setPasswordStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative border-b border-slate-800 bg-slate-900/35 px-5 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/40 to-sky-300/0" />
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Profile Settings
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage your display name, username, email address, and password.
          </p>
        </div>

        <form onSubmit={saveProfile} className="space-y-5 p-5">
          <Field
            label="Username"
            icon={<UserRound className="h-4 w-4" />}
            hint="Shown in account menus and future activity/history views."
          >
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. nightmareasian"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </Field>

          <Field label="Full name" icon={<IdCard className="h-4 w-4" />}>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </Field>

          <Field label="Email" icon={<AtSign className="h-4 w-4" />}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
            <StatusText status={profileStatus} message={profileStatus !== "idle" ? message : ""} />
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-950/25 transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save profile
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="surface-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {profile.username || profile.full_name || "MiniKB User"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-200">
            {profile.role}
          </div>
        </section>

        <section className="surface-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-orange-300" />
            <h2 className="text-sm font-semibold text-white">Change password</h2>
          </div>

          <form onSubmit={savePassword} className="space-y-3">
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              placeholder="Current password"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Confirm new password"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />

            <StatusText status={passwordStatus} message={passwordStatus !== "idle" ? message : ""} />

            <button
              type="submit"
              disabled={savingPassword || !oldPassword || !password || !passwordConfirm}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:border-orange-500/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update password
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span className="text-orange-300">{icon}</span>
        {label}
      </div>
      {children}
      {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
    </label>
  );
}

function StatusText({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (!message) return <div />;

  return (
    <p className={status === "success" ? "text-sm text-emerald-300" : "text-sm text-red-300"}>
      {message}
    </p>
  );
}
