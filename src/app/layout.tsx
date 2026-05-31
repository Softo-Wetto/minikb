import "@/app/globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MiniKB",
  description: "A lightweight internal knowledge base",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-slate-950 text-white">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_34rem),linear-gradient(180deg,#020617,#020617)] text-white">
          <AppShell profile={profile}>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
