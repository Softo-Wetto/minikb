"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Building2,
  ChevronDown,
  Command,
  FilePlus2,
  Gauge,
  LogOut,
  Search,
  Server,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { getClientRecords, signOut } from "@/lib/pocketbase/client";
import MiniKbLogo from "@/components/minikb-logo";
import type { RawPocketBaseRecord } from "@/types/database";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: "admin" | "editor" | "viewer";
};

type SearchResult = {
  id: string;
  label: string;
  detail: string;
  href: string;
  type: "Article" | "Asset" | "Company";
};

type CompanySummary = RawPocketBaseRecord & {
  name: string;
  website?: string | null;
};

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function AppHeader({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [contextCompany, setContextCompany] = useState<CompanySummary | null>(null);
  const [resolvedContextCompanyId, setResolvedContextCompanyId] = useState<string | null>(null);

  const canEdit = profile?.role === "admin" || profile?.role === "editor";
  const routeCompanyId = useMemo(() => {
    const companyMatch = pathname.match(/^\/companies\/([^/]+)/);
    if (companyMatch && companyMatch[1] !== "new") {
      return decodeURIComponent(companyMatch[1]);
    }

    const seededCompanyId = searchParams.get("companyId");
    if (seededCompanyId) return seededCompanyId;

    return null;
  }, [pathname, searchParams]);

  const recordContext = useMemo(() => {
    const articleMatch = pathname.match(/^\/articles\/([^/]+)/);
    if (articleMatch && articleMatch[1] !== "new") {
      return { collection: "articles", id: decodeURIComponent(articleMatch[1]) };
    }

    const assetMatch = pathname.match(/^\/assets\/([^/]+)/);
    if (assetMatch && assetMatch[1] !== "new") {
      return { collection: "assets", id: decodeURIComponent(assetMatch[1]) };
    }

    return null;
  }, [pathname]);

  const contextCompanyId = routeCompanyId || resolvedContextCompanyId;

  const currentArea = useMemo(() => {
    if (contextCompanyId) return "Client KB";
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/articles")) return "Central KB";
    if (pathname.startsWith("/assets")) return "Global Assets";
    if (pathname.startsWith("/companies")) return "Clients";
    if (pathname.startsWith("/admin")) return "Admin";
    return "Workspace";
  }, [contextCompanyId, pathname]);

  const globalNav = useMemo(() => {
    const items = [
      { href: "/", label: "Dashboard", icon: Gauge },
      { href: "/articles", label: "Central KB", icon: BookOpenText },
      { href: "/companies", label: "Clients", icon: Building2 },
      { href: "/assets", label: "Assets", icon: Server },
    ];

    if (profile?.role === "admin") {
      items.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
    }

    return items;
  }, [profile?.role]);

  async function handleLogout() {
    signOut();
    window.location.href = "/login";
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      window.location.href = "/articles";
      return;
    }

    if (results[0]) {
      window.location.href = results[0].href;
      return;
    }

    window.location.href = `/articles?q=${encodeURIComponent(q)}`;
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveRecordCompany() {
      if (routeCompanyId || !recordContext) {
        setResolvedContextCompanyId(null);
        return;
      }

      try {
        const response = await getClientRecords<RawPocketBaseRecord & { company_id?: string | null }>(
          recordContext.collection,
          new URLSearchParams({
            page: "1",
            perPage: "1",
            fields: "id,company_id",
            filter: `id = "${escapeFilterValue(recordContext.id)}"`,
          })
        );

        if (!cancelled) setResolvedContextCompanyId(response.items[0]?.company_id || null);
      } catch {
        if (!cancelled) setResolvedContextCompanyId(null);
      }
    }

    resolveRecordCompany();

    return () => {
      cancelled = true;
    };
  }, [recordContext, routeCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyContext() {
      if (!contextCompanyId) {
        setContextCompany(null);
        return;
      }

      try {
        const response = await getClientRecords<CompanySummary>(
          "companies",
          new URLSearchParams({
            page: "1",
            perPage: "1",
            fields: "id,name,website",
            filter: `id = "${escapeFilterValue(contextCompanyId)}"`,
          })
        );

        if (!cancelled) setContextCompany(response.items[0] ?? null);
      } catch {
        if (!cancelled) setContextCompany(null);
      }
    }

    loadCompanyContext();

    return () => {
      cancelled = true;
    };
  }, [contextCompanyId]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      const escaped = escapeFilterValue(q);

      try {
        const [articles, assets, companies] = await Promise.all([
          getClientRecords<RawPocketBaseRecord & {
            title: string;
            summary?: string | null;
            category?: string | null;
          }>(
            "articles",
            new URLSearchParams({
              page: "1",
              perPage: "4",
              fields: "id,title,summary,category",
              filter: `title ~ "${escaped}" || summary ~ "${escaped}" || category ~ "${escaped}"`,
            })
          ),
          getClientRecords<RawPocketBaseRecord & {
            name: string;
            asset_type?: string | null;
            description?: string | null;
          }>(
            "assets",
            new URLSearchParams({
              page: "1",
              perPage: "4",
              fields: "id,name,asset_type,description",
              filter: `name ~ "${escaped}" || description ~ "${escaped}" || asset_type ~ "${escaped}"`,
            })
          ),
          getClientRecords<RawPocketBaseRecord & {
            name: string;
            website?: string | null;
            description?: string | null;
          }>(
            "companies",
            new URLSearchParams({
              page: "1",
              perPage: "4",
              fields: "id,name,website,description",
              filter: `name ~ "${escaped}" || website ~ "${escaped}" || description ~ "${escaped}"`,
            })
          ),
        ]);

        if (cancelled) return;

        setResults(
          [
            ...articles.items.map((article) => ({
              id: `article-${article.id}`,
              label: article.title,
              detail: article.category || article.summary || "Knowledge base",
              href: `/articles/${article.id}`,
              type: "Article" as const,
            })),
            ...assets.items.map((asset) => ({
              id: `asset-${asset.id}`,
              label: asset.name,
              detail: asset.asset_type?.replace(/_/g, " ") || asset.description || "Asset",
              href: `/assets/${asset.id}`,
              type: "Asset" as const,
            })),
            ...companies.items.map((company) => ({
              id: `company-${company.id}`,
              label: company.name,
              detail: company.website || company.description || "Company",
              href: `/companies/${company.id}`,
              type: "Company" as const,
            })),
          ].slice(0, 8)
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/88 shadow-[0_12px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <MiniKbLogo />
          </Link>

          <div className="hidden h-6 w-px bg-slate-800 md:block" />

          <div
            className={`hidden min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold md:inline-flex ${
              contextCompanyId ? "client-context-chip text-sky-100" : "kb-context-chip text-orange-100"
            }`}
          >
            {contextCompanyId ? (
              <Building2 className="h-3.5 w-3.5 text-sky-200" />
            ) : pathname === "/" ? (
              <Gauge className="h-3.5 w-3.5 text-orange-200" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-orange-200" />
            )}
            <span className="shrink-0">{currentArea}</span>
            {contextCompanyId && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span className="max-w-[180px] truncate text-slate-200">
                  {contextCompany?.name || "Client workspace"}
                </span>
              </>
            )}
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-800/90 bg-slate-900/42 p-1 shadow-inner shadow-black/20 xl:flex">
          {globalNav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                  active && !contextCompanyId
                    ? "bg-orange-500/14 text-orange-100 ring-1 ring-orange-500/25"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active && !contextCompanyId ? "text-orange-300" : "text-slate-500"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          onSubmit={handleSearchSubmit}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
          className="relative hidden h-10 w-full max-w-xl items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 text-white shadow-inner shadow-black/20 transition focus-within:border-orange-500/70 focus-within:bg-slate-900 lg:flex"
        >
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Smart search articles, assets, companies..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          <span className="hidden items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 xl:inline-flex">
            <Command className="h-3 w-3" />
            Detects type
          </span>

          {searchOpen && search.trim().length >= 2 && (
            <div className="animate-pop-in absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/98 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="border-b border-slate-800 bg-slate-900/45 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {searching
                  ? "Searching..."
                  : results.length > 0
                    ? "Detected Results"
                    : "No matches"}
              </div>

              {results.length > 0 ? (
                <div className="max-h-96 overflow-y-auto p-2">
                  {results.map((result) => {
                    const Icon =
                      result.type === "Article"
                        ? BookOpenText
                        : result.type === "Asset"
                          ? Server
                          : Building2;

                    return (
                      <Link
                        key={result.id}
                        href={result.href}
                        className="interactive-surface flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-orange-200"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-100">
                            {result.label}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {result.type} - {result.detail}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Press Enter to search articles for &quot;{search.trim()}&quot;.
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              href="/articles/new"
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition hover:from-orange-400 hover:to-amber-400"
            >
              <FilePlus2 className="h-4 w-4" />
              <span className="hidden sm:inline">New Article</span>
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/70 px-2.5 text-slate-200 transition hover:border-orange-500/40 hover:bg-slate-900"
            >
              <UserCircle2 className="h-5 w-5" />
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {menuOpen && (
              <div className="animate-pop-in absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-800 bg-slate-950/98 p-2 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="border-b border-slate-800 px-2 py-2">
                  <p className="truncate text-sm font-semibold">
                    {profile?.username || profile?.full_name || profile?.email || "Not signed in"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {profile?.email || "No active account"}
                  </p>
                  <p className="mt-2 inline-flex rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-orange-300">
                    {profile?.role || "guest"}
                  </p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  <UserCircle2 className="h-4 w-4" />
                  Profile settings
                </Link>

                <button
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
