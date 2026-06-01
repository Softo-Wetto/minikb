"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/app-header";
import AppSidebar from "@/components/app-sidebar";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: "admin" | "editor" | "viewer";
};

export default function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/login");

  if (isAuthPage) {
    return <main className="min-h-screen animate-fade-in">{children}</main>;
  }

  return (
    <>
      <AppHeader profile={profile} />
      <div className="relative flex min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/30 to-transparent" />
        <AppSidebar role={profile?.role ?? "viewer"} />
        <main className="relative min-w-0 flex-1 animate-fade-in px-4 py-4 lg:px-5">
          {children}
        </main>
      </div>
    </>
  );
}
