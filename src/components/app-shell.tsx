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
      <div className="minikb-workspace relative flex min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        <AppSidebar role={profile?.role ?? "viewer"} />
        <main className="minikb-main relative min-w-0 flex-1 animate-slide-up px-4 py-5 sm:px-5 lg:px-6 lg:py-6 2xl:px-8" style={{ animationDuration: "240ms" }}>
          {children}
        </main>
      </div>
    </>
  );
}
