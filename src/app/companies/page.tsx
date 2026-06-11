import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Building2,
  ExternalLink,
  Filter,
  Globe2,
  Plus,
  Search,
  Server,
} from "lucide-react";
import { getRecords } from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import type { Company, RawPocketBaseRecord } from "@/types/database";

type CompanyRow = Company;
type CompanyLinkRecord = RawPocketBaseRecord & {
  company_id?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function incrementCount(map: Map<string, number>, companyId?: string | null) {
  if (!companyId) return;
  map.set(companyId, (map.get(companyId) || 0) + 1);
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  await requireUser();
  const { q = "", status = "", sort = "name" } = await searchParams;

  let companies: CompanyRow[] = [];
  let articleCounts = new Map<string, number>();
  let assetCounts = new Map<string, number>();

  try {
    const { items } = await getRecords<CompanyRow>("companies", {
      sort: sort === "recent" ? "-updated_at" : "name",
    });
    companies = items;
  } catch {
    companies = [];
  }

  try {
    const { items } = await getRecords<CompanyLinkRecord>("articles", {
      fields: "id,company_id",
      perPage: 500,
    });
    articleCounts = items.reduce((map, article) => {
      incrementCount(map, article.company_id);
      return map;
    }, new Map<string, number>());
  } catch {
    articleCounts = new Map();
  }

  try {
    const { items } = await getRecords<CompanyLinkRecord>("assets", {
      fields: "id,company_id",
      perPage: 500,
    });
    assetCounts = items.reduce((map, asset) => {
      incrementCount(map, asset.company_id);
      return map;
    }, new Map<string, number>());
  } catch {
    assetCounts = new Map();
  }

  const query = q.trim().toLowerCase();
  const filteredCompanies = companies.filter((company) => {
    const articleCount = articleCounts.get(company.id) || 0;
    const assetCount = assetCounts.get(company.id) || 0;
    const matchesQuery = !query || (
      company.name.toLowerCase().includes(query) ||
      (company.website || "").toLowerCase().includes(query) ||
      (company.description || "").toLowerCase().includes(query)
    );
    const matchesStatus =
      !status ||
      (status === "needs-docs" && articleCount === 0) ||
      (status === "needs-assets" && assetCount === 0) ||
      (status === "missing-website" && !company.website);

    return matchesQuery && matchesStatus;
  });
  const missingWebsiteCount = companies.filter((company) => !company.website).length;
  const clientsWithoutDocs = companies.filter(
    (company) => (articleCounts.get(company.id) || 0) === 0
  ).length;
  const clientsWithoutAssets = companies.filter(
    (company) => (assetCounts.get(company.id) || 0) === 0
  ).length;
  const hasFilters = Boolean(query || status || sort !== "name");

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/35 px-5 py-5 sm:flex-row sm:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/40 to-sky-300/0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              Clients
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Companies
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Organize documentation and assets by customer or internal entity.
            </p>
          </div>

          <Link
            href="/companies/new"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/25 transition hover:from-orange-400 hover:to-amber-400"
          >
            <Plus className="h-4 w-4" />
            New Company
          </Link>
        </div>

        <div className="grid gap-px border-b border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Clients
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{companies.length}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Missing Website
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{missingWebsiteCount}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Need Articles
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{clientsWithoutDocs}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Need Assets
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{clientsWithoutAssets}</p>
          </div>
        </div>

        <form className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-white focus-within:border-orange-500/70">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search companies, websites, notes..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </label>

          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
          >
            <option value="">All Clients</option>
            <option value="needs-docs">Needs articles</option>
            <option value="needs-assets">Needs assets</option>
            <option value="missing-website">Missing website</option>
          </select>

          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
          >
            <option value="name">A-Z</option>
            <option value="recent">Recently updated</option>
          </select>

          <button
            type="submit"
            className="rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500/60 hover:text-orange-200"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/45 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>
              Showing {filteredCompanies.length} of {companies.length}
            </span>
            {status && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                {status === "needs-docs"
                  ? "Needs articles"
                  : status === "needs-assets"
                    ? "Needs assets"
                    : "Missing website"}
              </span>
            )}
            {query && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                Search: {q}
              </span>
            )}
            {sort === "recent" && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                Recently updated
              </span>
            )}
          </div>
          {hasFilters && (
            <Link
              href="/companies"
              className="text-xs font-semibold text-orange-300 transition hover:text-orange-200"
            >
              Clear filters
            </Link>
          )}
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-400">
            No companies found.
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="interactive-surface group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/35 p-4 transition hover:border-orange-500/40 hover:bg-slate-900/70"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-300/0 via-sky-300/35 to-orange-300/0 opacity-0 transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-orange-500 text-sm font-black text-white shadow-lg shadow-sky-950/20">
                      {company.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-white">
                        {company.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <Globe2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {company.website || "No website"}
                        </span>
                      </p>
                    </div>
                  </div>
                  {company.website ? (
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-orange-300" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-orange-300" />
                  )}
                </div>

                <p className="mt-4 min-h-[3rem] line-clamp-2 text-sm leading-6 text-slate-400">
                  {company.description || "No description yet."}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <BookOpenText className="h-3.5 w-3.5 text-orange-300" />
                      Articles
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {articleCounts.get(company.id) || 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Server className="h-3.5 w-3.5 text-orange-300" />
                      Assets
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {assetCounts.get(company.id) || 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                    <div className="text-[11px] text-slate-500">Updated</div>
                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {formatDate(company.updated_at || company.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(articleCounts.get(company.id) || 0) === 0 && (
                      <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-200">
                        Needs docs
                      </span>
                    )}
                    {(assetCounts.get(company.id) || 0) === 0 && (
                      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-200">
                        Needs assets
                      </span>
                    )}
                    {!company.website && (
                      <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[11px] font-semibold text-slate-300">
                        Missing website
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 transition group-hover:translate-x-0.5">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
