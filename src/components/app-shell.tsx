"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/app-header";
import AppSidebar from "@/components/app-sidebar";

type Profile = {
  id: string;
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
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        <AppSidebar role={profile?.role ?? "viewer"} />
        <main className="min-w-0 flex-1 animate-fade-in px-4 py-4">
          {children}
        </main>
      </div>
    </>
  );
}
