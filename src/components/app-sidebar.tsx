"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Building2,
  ChevronLeft,
  FilePlus2,
  Gauge,
  Library,
  Plus,
  Server,
  Shield,
} from "lucide-react";
import { getClientRecords } from "@/lib/pocketbase/client";
import { cn } from "@/lib/utils";
import type { RawPocketBaseRecord } from "@/types/database";

type CompanySummary = RawPocketBaseRecord & {
  name: string;
  website?: string | null;
};

type ClientSection = "overview" | "articles" | "assets";

export default function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const canEdit = role === "admin" || role === "editor";
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanySummary | null>(null);

  const routeContext = useMemo(() => {
    const companyMatch = pathname.match(/^\/companies\/([^/]+)/);
    if (companyMatch && companyMatch[1] !== "new") {
      return {
        type: "company" as const,
        id: decodeURIComponent(companyMatch[1]),
      };
    }

    const seededCompanyId = searchParams.get("companyId");
    if (
      seededCompanyId &&
      (pathname === "/articles/new" || pathname === "/assets/new")
    ) {
      return {
        type: "company" as const,
        id: seededCompanyId,
      };
    }

    const articleMatch = pathname.match(/^\/articles\/([^/]+)/);
    if (articleMatch && articleMatch[1] !== "new") {
      return {
        type: "article" as const,
        id: decodeURIComponent(articleMatch[1]),
      };
    }

    const assetMatch = pathname.match(/^\/assets\/([^/]+)/);
    if (assetMatch && assetMatch[1] !== "new") {
      return {
        type: "asset" as const,
        id: decodeURIComponent(assetMatch[1]),
      };
    }

    return null;
  }, [pathname, searchParams]);

  const clientId = routeContext?.type === "company"
    ? routeContext.id
    : routeContext
      ? resolvedClientId
      : null;

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function resolveClientId() {
      if (!routeContext) {
        setResolvedClientId(null);
        setCompany(null);
        return;
      }

      if (routeContext.type === "company") {
        setResolvedClientId(null);
        return;
      }

      const collection = routeContext.type === "article" ? "articles" : "assets";

      try {
        const params = new URLSearchParams({
          page: "1",
          perPage: "1",
          fields: "id,company_id",
          filter: `id = "${routeContext.id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        });
        const response = await getClientRecords<RawPocketBaseRecord & { company_id?: string | null }>(
          collection,
          params
        );

        if (!cancelled) setResolvedClientId(response.items[0]?.company_id || null);
      } catch {
        if (!cancelled) {
          setResolvedClientId(null);
          setCompany(null);
        }
      }
    }

    resolveClientId();

    return () => {
      cancelled = true;
    };
  }, [routeContext]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      if (!clientId) {
        setCompany(null);
        return;
      }

      try {
        const params = new URLSearchParams({
          page: "1",
          perPage: "1",
          fields: "id,name,website",
          filter: `id = "${clientId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        });
        const response = await getClientRecords<CompanySummary>("companies", params);
        if (!cancelled) setCompany(response.items[0] ?? null);
      } catch {
        if (!cancelled) setCompany(null);
      }
    }

    loadCompany();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const globalItems = [
    { href: "/", label: "Dashboard", icon: Gauge },
    { href: "/articles", label: "Knowledge Base", icon: BookOpenText },
    { href: "/companies", label: "Companies", icon: Building2 },
    { href: "/assets", label: "Assets", icon: Server },
  ];

  if (role === "admin") {
    globalItems.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  const activeClientSection = pathname.startsWith("/articles/")
    ? "articles"
    : pathname.startsWith("/assets/")
      ? "assets"
      : hash === "#articles"
        ? "articles"
        : hash === "#assets"
          ? "assets"
          : "overview";

  const clientItems = clientId
    ? [
        { href: `/companies/${clientId}`, label: "Overview", icon: Building2, section: "overview" as const },
        { href: `/companies/${clientId}#articles`, label: "Articles", icon: BookOpenText, section: "articles" as const },
        { href: `/companies/${clientId}#assets`, label: "Assets", icon: Server, section: "assets" as const },
      ]
    : [];

  const items = clientId ? clientItems : globalItems;
  const workspaceLabel = clientId ? "Client Workspace" : "Workspace";

  function handleClientSectionClick(section: ClientSection) {
    if (!clientId || pathname !== `/companies/${clientId}`) return;

    const nextHash = section === "overview" ? "" : `#${section}`;
    setHash(nextHash);
    window.history.replaceState(null, "", `/companies/${clientId}${nextHash}`);

    if (section === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/92 xl:block">
      <div className="sticky top-14 space-y-3 p-3">
        <div className="rounded border border-slate-800 bg-slate-950/80 p-3">
          <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Library className="h-3.5 w-3.5" />
            {workspaceLabel}
          </div>

          {clientId && (
            <div className="mb-3 rounded border border-orange-500/20 bg-orange-500/10 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-orange-500 text-sm font-black text-white">
                  {(company?.name || "C").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {company?.name || "Client"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {company?.website || "Company workspace"}
                  </p>
                </div>
              </div>

              <Link
                href="/companies"
                className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-orange-200 transition hover:text-orange-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                All companies
              </Link>
            </div>
          )}

          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = clientId
                ? "section" in item && item.section === activeClientSection
                : item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if ("section" in item) {
                      handleClientSectionClick(item.section as ClientSection);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-3 rounded px-3 py-2 text-sm transition",
                    active
                      ? "bg-orange-500/12 text-orange-200 ring-1 ring-orange-500/25"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-orange-300" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {clientId && canEdit && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
              <Link
                href={`/articles/new?companyId=${encodeURIComponent(clientId)}`}
                className="inline-flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                Article
              </Link>
              <Link
                href={`/assets/new?companyId=${encodeURIComponent(clientId)}`}
                className="inline-flex items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Asset
              </Link>
            </div>
          )}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {clientId ? "Client Mode" : "Quick Tip"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {clientId
              ? "Company pages keep articles and assets filtered to the current client."
              : "Pin important articles to make them surface on the dashboard."}
          </p>
        </div>
      </div>
    </aside>
  );
}
