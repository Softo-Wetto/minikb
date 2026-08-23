"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Building2,
  ChevronLeft,
  FilePlus2,
  Library,
  Plus,
  Server,
} from "lucide-react";
import CompanyAvatar from "@/components/company-avatar";
import {
  companyWorkspaceHref,
  normalizeClientView,
  type ClientView,
} from "@/lib/client-workspace";
import { getCompanyWebsiteHostname } from "@/lib/company-branding";
import { getClientRecords } from "@/lib/pocketbase/client";
import { cn } from "@/lib/utils";
import type { RawPocketBaseRecord } from "@/types/database";

type CompanySummary = RawPocketBaseRecord & {
  name: string;
  website?: string | null;
};

type ClientCounts = {
  articles: number;
  assets: number;
};

const emptyCounts: ClientCounts = { articles: 0, assets: 0 };

function escapedRecordFilter(field: string, value: string) {
  return `${field} = "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export default function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = role === "admin" || role === "editor";
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [counts, setCounts] = useState<ClientCounts>(emptyCounts);

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
    let cancelled = false;

    async function resolveClientId() {
      if (!routeContext) {
        setResolvedClientId(null);
        setCompany(null);
        setCounts(emptyCounts);
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
          filter: escapedRecordFilter("id", routeContext.id),
        });
        const response = await getClientRecords<
          RawPocketBaseRecord & { company_id?: string | null }
        >(collection, params);

        if (!cancelled) setResolvedClientId(response.items[0]?.company_id || null);
      } catch {
        if (!cancelled) {
          setResolvedClientId(null);
          setCompany(null);
          setCounts(emptyCounts);
        }
      }
    }

    void resolveClientId();

    return () => {
      cancelled = true;
    };
  }, [routeContext]);

  useEffect(() => {
    let cancelled = false;

    async function loadClientWorkspace() {
      if (!clientId) {
        setCompany(null);
        setCounts(emptyCounts);
        return;
      }

      const companyFilter = escapedRecordFilter("id", clientId);
      const linkedFilter = escapedRecordFilter("company_id", clientId);
      const [companyResult, articleResult, assetResult] = await Promise.allSettled([
        getClientRecords<CompanySummary>(
          "companies",
          new URLSearchParams({
            page: "1",
            perPage: "1",
            fields: "id,name,website",
            filter: companyFilter,
          }),
        ),
        getClientRecords<RawPocketBaseRecord>(
          "articles",
          new URLSearchParams({
            page: "1",
            perPage: "1",
            fields: "id",
            filter: linkedFilter,
          }),
        ),
        getClientRecords<RawPocketBaseRecord>(
          "assets",
          new URLSearchParams({
            page: "1",
            perPage: "1",
            fields: "id",
            filter: linkedFilter,
          }),
        ),
      ]);

      if (cancelled) return;

      setCompany(
        companyResult.status === "fulfilled"
          ? companyResult.value.items[0] ?? null
          : null,
      );
      setCounts({
        articles:
          articleResult.status === "fulfilled"
            ? articleResult.value.totalItems
            : 0,
        assets:
          assetResult.status === "fulfilled" ? assetResult.value.totalItems : 0,
      });
    }

    void loadClientWorkspace();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  const companyPath = companyWorkspaceHref(clientId, "overview");
  const activeClientSection: ClientView = pathname.startsWith("/articles/")
    ? "articles"
    : pathname.startsWith("/assets/")
      ? "assets"
      : normalizeClientView(searchParams.get("view"));
  const clientItems = [
    {
      label: "Overview",
      icon: Building2,
      section: "overview" as const,
      count: counts.articles + counts.assets,
    },
    {
      label: "Articles",
      icon: BookOpenText,
      section: "articles" as const,
      count: counts.articles,
    },
    {
      label: "Assets",
      icon: Server,
      section: "assets" as const,
      count: counts.assets,
    },
  ];
  const hostname = getCompanyWebsiteHostname(company?.website);

  function handleClientSectionClick(section: ClientView) {
    const href = companyWorkspaceHref(clientId!, section);
    const stayingOnCompanyPage = pathname === companyPath;
    router.push(href, { scroll: !stayingOnCompanyPage });
  }

  return (
    <aside className="minikb-client-sidebar hidden w-[18.5rem] shrink-0 border-r border-slate-800/80 bg-slate-950/76 backdrop-blur-xl xl:block">
      <div className="sticky top-16 space-y-3 p-4">
        <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Library className="h-3.5 w-3.5" />
          Client Workspace
        </div>

        <section className="surface-panel overflow-hidden rounded-lg">
          <div className="flex items-start gap-3 border-b border-slate-800 p-3.5">
            <CompanyAvatar
              name={company?.name || "Client"}
              website={company?.website}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {company?.name || "Client"}
              </p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {hostname || "No website recorded"}
              </p>
            </div>
          </div>
          <Link
            href="/companies"
            className="group flex h-9 items-center gap-2 px-3.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-900/70 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            All companies
          </Link>
        </section>

        <nav className="surface-panel space-y-1 rounded-lg p-2">
          {clientItems.map((item) => {
            const Icon = item.icon;
            const active = item.section === activeClientSection;

            return (
              <button
                key={item.section}
                type="button"
                onClick={() => handleClientSectionClick(item.section)}
                className={cn(
                  "group relative flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
                  active
                    ? "bg-sky-400/12 text-sky-100 ring-1 ring-inset ring-sky-400/25"
                    : "text-slate-400 hover:bg-slate-900/85 hover:text-white",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sky-300" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active
                      ? "text-sky-200"
                      : "text-slate-500 group-hover:text-slate-300",
                  )}
                />
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto rounded-md border border-slate-800 bg-slate-950/65 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        {canEdit && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/articles/new?companyId=${encodeURIComponent(clientId)}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/50 hover:text-sky-100"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Article
            </Link>
            <Link
              href={`/assets/new?companyId=${encodeURIComponent(clientId)}`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 transition hover:border-sky-400/50 hover:text-sky-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Asset
            </Link>
          </div>
        )}

        <section className="surface-card grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-800">
          <div className="bg-slate-950/85 p-3">
            <p className="text-[11px] uppercase text-slate-500">Articles</p>
            <p className="mt-1 text-xl font-semibold text-white">{counts.articles}</p>
          </div>
          <div className="bg-slate-950/85 p-3">
            <p className="text-[11px] uppercase text-slate-500">Assets</p>
            <p className="mt-1 text-xl font-semibold text-white">{counts.assets}</p>
          </div>
        </section>
      </div>
    </aside>
  );
}
