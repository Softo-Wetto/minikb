"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpenText,
  Building2,
  ChevronDown,
  FilePlus2,
  LogOut,
  Search,
  Server,
  UserCircle2,
} from "lucide-react";
import { getClientRecords, signOut } from "@/lib/pocketbase/client";
import MiniKbLogo from "@/components/minikb-logo";
import type { RawPocketBaseRecord } from "@/types/database";

type Profile = {
  id: string;
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

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function AppHeader({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const canEdit = profile?.role === "admin" || profile?.role === "editor";

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
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/92 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <MiniKbLogo />
          </Link>

          <div className="hidden h-5 w-px bg-slate-800 md:block" />

          <div className="hidden text-xs text-slate-400 md:block">
            {pathname === "/" ? "Dashboard" : pathname.split("/").filter(Boolean)[0] || "Home"}
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
          className="relative hidden h-9 w-full max-w-xl items-center gap-2 rounded border border-slate-800 bg-slate-900/70 px-3 text-white transition focus-within:border-orange-500/70 focus-within:bg-slate-900 lg:flex"
        >
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search articles, assets, companies..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />

          {searchOpen && search.trim().length >= 2 && (
            <div className="animate-pop-in absolute left-0 right-0 top-11 z-50 overflow-hidden rounded border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
              <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                        className="flex items-center gap-3 rounded px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-orange-200"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-900 text-orange-300 ring-1 ring-slate-800">
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
              className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm shadow-orange-950/30 transition hover:bg-orange-400"
            >
              <FilePlus2 className="h-4 w-4" />
              <span className="hidden sm:inline">New Article</span>
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1 rounded border border-slate-800 bg-slate-900/70 px-2 text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
            >
              <UserCircle2 className="h-5 w-5" />
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {menuOpen && (
              <div className="animate-pop-in absolute right-0 top-11 z-50 w-64 rounded border border-slate-800 bg-slate-950 p-2 text-white shadow-2xl shadow-black/30">
                <div className="border-b border-slate-800 px-2 py-2">
                  <p className="truncate text-sm font-semibold">
                    {profile?.full_name || profile?.email || "Not signed in"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {profile?.email || "No active account"}
                  </p>
                  <p className="mt-2 inline-flex rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-orange-300">
                    {profile?.role || "guest"}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
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
