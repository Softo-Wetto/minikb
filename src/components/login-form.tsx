"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/pocketbase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      if (password !== passwordConfirm) {
        setMessageType("error");
        setMessage("Passwords do not match.");
        setLoading(false);
        return;
      }

      try {
        await signUpWithPassword(email, password);
        setMessageType("success");
        setMessage("Account created. Check your email if confirmation is enabled.");
      } catch (error) {
        setMessageType("error");
        setMessage(error instanceof Error ? error.message : "Unable to create account.");
      }
    } else {
      try {
        await signInWithPassword(email, password);
        window.location.href = "/";
      } catch (error) {
        setMessageType("error");
        setMessage(error instanceof Error ? error.message : "Unable to log in.");
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            mode === "login"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Create
        </button>
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
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

        {mode === "signup" && (
          <label className="animate-slide-down group relative block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Confirm password
            </span>
            <LockKeyhole className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 text-slate-500 transition group-focus-within:text-orange-300" />
            <input
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70 focus:bg-slate-900"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-submit-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-950/35 transition hover:from-orange-400 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            Please wait
          </>
        ) : (
          <>
            {mode === "login" ? "Enter workspace" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {message && (
        <p
          className={`animate-slide-down flex items-start gap-2 rounded-2xl border px-3 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message}
        </p>
      )}

      <p className="text-center text-xs leading-5 text-slate-500">
        Protected by your self-hosted PocketBase backend.
      </p>
    </form>
  );
}
