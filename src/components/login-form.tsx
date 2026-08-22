"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { signInWithPassword } from "@/lib/pocketbase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await signInWithPassword(email, password);
      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log in.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 border-l-2 border-orange-400 pl-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
        <div>
          <p className="text-sm font-semibold text-white">Private workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Access is issued by the workspace administrator.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="group relative block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </span>
          <Mail className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 text-slate-500 transition group-focus-within:text-orange-300" />
          <input
            className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70 focus:bg-slate-900"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="group relative block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </span>
          <LockKeyhole className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 text-slate-500 transition group-focus-within:text-orange-300" />
          <input
            className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/70 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70 focus:bg-slate-900"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-[2.1rem] inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-white"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-submit-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            Signing in
          </>
        ) : (
          <>
            Enter workspace
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {message && (
        <p className="animate-slide-down flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </p>
      )}

      <p className="text-center text-xs leading-5 text-slate-500">
        New accounts can only be created by the MiniKB administrator.
      </p>
    </form>
  );
}
