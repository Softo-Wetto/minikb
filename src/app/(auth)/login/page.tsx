import LoginForm from "@/components/login-form";
import MiniKbLogo from "@/components/minikb-logo";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full rounded border border-slate-800 bg-slate-950/90 p-8 shadow-2xl shadow-black/30">
        <div className="mb-6">
          <MiniKbLogo
            markClassName="h-12 w-12 rounded-lg"
            wordmarkClassName="text-base"
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Access your MiniKB workspace, procedures, assets, and client notes.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
