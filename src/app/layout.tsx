import "@/app/globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.softowetto.com"),
  title: {
    default: "MiniKB | Internal Knowledge Base and Client Documentation",
    template: "%s | MiniKB",
  },
  description:
    "MiniKB is a clean internal knowledge base for organizing articles, client documentation, assets, folders, attachments, and operational notes.",
  applicationName: "MiniKB",
  keywords: [
    "knowledge base",
    "internal documentation",
    "client documentation",
    "IT documentation",
    "runbooks",
    "assets",
    "company knowledge base",
  ],
  authors: [{ name: "MiniKB" }],
  creator: "MiniKB",
  publisher: "MiniKB",
  category: "productivity",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: "https://docs.softowetto.com",
    siteName: "MiniKB",
    title: "MiniKB | Internal Knowledge Base and Client Documentation",
    description:
      "Organize internal articles, client documentation, folders, attachments, and IT asset notes in one focused workspace.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "MiniKB logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "MiniKB | Internal Knowledge Base and Client Documentation",
    description:
      "Organize internal articles, client documentation, folders, attachments, and IT asset notes in one focused workspace.",
    images: ["/icon.svg"],
  },
  robots: {
    index: false,
    follow: false,
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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.13),transparent_34rem),radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.10),transparent_32rem),linear-gradient(180deg,#020617,#020617_58%,#030712)] text-white">
          <AppShell profile={profile}>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
