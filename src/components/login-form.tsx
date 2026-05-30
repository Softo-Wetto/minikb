"use client";

import { useState } from "react";
import {
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/pocketbase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      try {
        await signUpWithPassword(email, password);
        setMessage("Account created. Check your email if confirmation is enabled.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to create account.");
      }
    } else {
      try {
        await signInWithPassword(email, password);
        window.location.href = "/";
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to log in.");
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="h-10 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        className="h-10 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
      >
        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
      </button>

      <button
        type="button"
        className="w-full text-sm text-slate-400 transition hover:text-white"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login"
          ? "Need an account? Sign up"
          : "Already have an account? Log in"}
      </button>

      {message && (
        <p className="rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
          {message}
        </p>
      )}
    </form>
  );
}
