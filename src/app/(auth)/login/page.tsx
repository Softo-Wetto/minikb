import LoginForm from "@/components/login-form";
import MiniKbLogo from "@/components/minikb-logo";
import { BookOpenText, Building2, DatabaseZap, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="auth-shell relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.045)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="auth-beam auth-beam-one" />
      <div className="auth-beam auth-beam-two" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden min-h-[620px] overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/70 shadow-2xl shadow-black/30 backdrop-blur-xl lg:block">
          <div className="relative h-full p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/50 to-transparent" />
            <div className="auth-orbit auth-orbit-one" />
            <div className="auth-orbit auth-orbit-two" />

            <MiniKbLogo
              markClassName="h-12 w-12 rounded-2xl"
              wordmarkClassName="text-lg"
            />

            <div className="mt-16 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                Secure Knowledge Workspace
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight text-white">
                Procedures, assets, and client notes in one clean command center.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                Sign in to manage your central KB, client-specific documentation, and operational records.
              </p>
            </div>

            <div className="auth-console mt-12 rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  MiniKB Live
                </span>
              </div>

              {[
                { icon: BookOpenText, label: "Central KB", value: "Runbooks synced" },
                { icon: Building2, label: "Client Workspaces", value: "Context aware" },
                { icon: DatabaseZap, label: "PocketBase", value: "Self hosted" },
                { icon: ShieldCheck, label: "Access", value: "Role protected" },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="auth-console-row"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{item.label}</span>
                      <span className="block text-xs text-slate-500">{item.value}</span>
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.75)]" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="auth-card animate-pop-in relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/92 p-6 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="mb-7">
          <MiniKbLogo
            markClassName="h-14 w-14 rounded-2xl"
            wordmarkClassName="text-lg"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Access your MiniKB workspace securely.
          </p>
        </div>
        <LoginForm />
        </section>
      </div>
    </div>
  );
}
