import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CalendarClock,
  ExternalLink,
  FilePlus2,
  Globe2,
  HardDrive,
  LayoutDashboard,
  Pencil,
  Plus,
  Server,
} from "lucide-react";
import CompanyAvatar from "@/components/company-avatar";
import { requireUser } from "@/lib/auth";
import {
  companyWorkspaceHref,
  normalizeClientView,
  type ClientView,
} from "@/lib/client-workspace";
import { getCompanyWebsiteHostname } from "@/lib/company-branding";
import {
  equalsFilter,
  getRecord,
  getRecords,
} from "@/lib/pocketbase/server";
import { canEdit } from "@/lib/roles";
import { cn, formatDate } from "@/lib/utils";
import type { Article, Asset, Company } from "@/types/database";

function assetTypeLabel(value?: string | null) {
  return (value || "asset")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parsePage(value?: string | string[]) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
function CompanyTabs({ companyId, view }: { companyId: string; view: ClientView }) {
  const tabs = [
    { label: "Overview", value: "overview" as const, icon: LayoutDashboard },
    { label: "Articles", value: "articles" as const, icon: BookOpenText },
    { label: "Assets", value: "assets" as const, icon: Server },
  ];

  return (
    <nav
      aria-label="Client workspace views"
      className="surface-panel flex min-h-12 items-center gap-1 overflow-x-auto rounded-lg p-1.5"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === view;

        return (
          <Link
            key={tab.value}
            href={companyWorkspaceHref(companyId, tab.value)}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
              active
                ? "bg-sky-400/12 text-sky-100 ring-1 ring-inset ring-sky-400/25"
                : "text-slate-400 hover:bg-slate-900/75 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspacePagination({
  companyId,
  view,
  page,
  totalPages,
  totalCount,
}: {
  companyId: string;
  view: Exclude<ClientView, "overview">;
  page: number;
  totalPages: number;
  totalCount: number;
}) {
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {currentPage} of {totalPages} - {totalCount} records
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 1 && (
          <Link
            href={companyWorkspaceHref(companyId, view, currentPage - 1)}
            scroll={false}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-500/50 hover:text-orange-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </Link>
        )}
        {currentPage < totalPages && (
          <Link
            href={companyWorkspaceHref(companyId, view, currentPage + 1)}
            scroll={false}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-500/50 hover:text-orange-200"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
function ArticlePanel({
  articles,
  companyId,
  totalCount,
  page = 1,
  totalPages = 1,
  compact = false,
}: {
  articles: Article[];
  companyId: string;
  totalCount: number;
  page?: number;
  totalPages?: number;
  compact?: boolean;
}) {
  return (
    <section className="surface-panel overflow-hidden rounded-lg">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <BookOpenText className="h-4 w-4 shrink-0 text-orange-300" />
          <h2 className="truncate text-sm font-semibold text-white">
            Knowledge Base
          </h2>
          <span className="rounded-md border border-slate-800 bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
            {totalCount}
          </span>
        </div>
        {compact && totalCount > 0 && (
          <Link
            href={companyWorkspaceHref(companyId, "articles")}
            scroll={false}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-orange-200"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-slate-800">
        {articles.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {totalCount > 0 ? "No articles on this page." : "No client articles yet."}
          </div>
        )}
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/articles/${article.id}`}
            className="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-900/75"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-100 transition group-hover:text-orange-200">
                {article.title}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {article.category || "General"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {formatDate(article.updated_at || article.created_at)}
            </span>
          </Link>
        ))}
      </div>
      {!compact && (
        <WorkspacePagination
          companyId={companyId}
          view="articles"
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      )}
    </section>
  );
}

function AssetPanel({
  assets,
  companyId,
  totalCount,
  page = 1,
  totalPages = 1,
  compact = false,
}: {
  assets: Asset[];
  companyId: string;
  totalCount: number;
  page?: number;
  totalPages?: number;
  compact?: boolean;
}) {
  return (
    <section className="surface-panel overflow-hidden rounded-lg">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Server className="h-4 w-4 shrink-0 text-orange-300" />
          <h2 className="truncate text-sm font-semibold text-white">Assets</h2>
          <span className="rounded-md border border-slate-800 bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
            {totalCount}
          </span>
        </div>
        {compact && totalCount > 0 && (
          <Link
            href={companyWorkspaceHref(companyId, "assets")}
            scroll={false}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-orange-200"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="divide-y divide-slate-800">
        {assets.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {totalCount > 0 ? "No assets on this page." : "No linked assets yet."}
          </div>
        )}
        {assets.map((asset) => (
          <Link
            key={asset.id}
            href={`/assets/${asset.id}`}
            className="group flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-slate-900/75"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-orange-300 ring-1 ring-slate-800 transition group-hover:ring-orange-400/35">
              <HardDrive className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white transition group-hover:text-orange-200">
                {asset.name}
              </span>
              <span className="mt-1 block truncate text-xs uppercase text-slate-500">
                {assetTypeLabel(asset.asset_type)}
              </span>
            </span>
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(asset.updated_at || asset.created_at)}
            </span>
          </Link>
        ))}
      </div>
      {!compact && (
        <WorkspacePagination
          companyId={companyId}
          view="assets"
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      )}
    </section>
  );
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    view?: string | string[];
    page?: string | string[];
  }>;
}) {
  const profile = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const view = normalizeClientView(
    Array.isArray(query.view) ? query.view[0] : query.view,
  );
  const requestedPage = parsePage(query.page);
  let company: Company | null = null;
  let articles: Article[] = [];
  let assets: Asset[] = [];
  let articleTotal = 0;
  let assetTotal = 0;
  let articlePage = 1;
  let assetPage = 1;
  let articleTotalPages = 1;
  let assetTotalPages = 1;

  try {
    company = await getRecord<Company>("companies", id);
  } catch {
    company = null;
  }

  if (company) {
    const [articleResult, assetResult] = await Promise.allSettled([
      getRecords<Article>("articles", {
        filter: equalsFilter("company_id", company.id),
        sort: "-updated_at",
        page: view === "articles" ? requestedPage : 1,
        perPage: view === "articles" ? 50 : view === "overview" ? 5 : 1,
      }),
      getRecords<Asset>("assets", {
        filter: equalsFilter("company_id", company.id),
        sort: "-updated_at",
        page: view === "assets" ? requestedPage : 1,
        perPage: view === "assets" ? 50 : view === "overview" ? 5 : 1,
      }),
    ]);

    if (articleResult.status === "fulfilled") {
      articles = articleResult.value.items;
      articleTotal = articleResult.value.totalItems;
      articlePage = articleResult.value.page;
      articleTotalPages = Math.max(articleResult.value.totalPages, 1);
    }

    if (assetResult.status === "fulfilled") {
      assets = assetResult.value.items;
      assetTotal = assetResult.value.totalItems;
      assetPage = assetResult.value.page;
      assetTotalPages = Math.max(assetResult.value.totalPages, 1);
    }
  }

  if (!company) {
    return (
      <div className="surface-panel rounded-lg p-8 text-slate-300">
        Company not found.
      </div>
    );
  }

  const hostname = getCompanyWebsiteHostname(company.website);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/companies"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/65 px-3 text-sm font-semibold text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Companies
        </Link>

        {canEdit(profile.role) && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/companies/${company.id}/edit`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <Pencil className="h-4 w-4" />
              Edit company
            </Link>
            <Link
              href={`/articles/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <FilePlus2 className="h-4 w-4" />
              New article
            </Link>
            <Link
              href={`/assets/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              <Plus className="h-4 w-4" />
              New asset
            </Link>
          </div>
        )}
      </div>

      <section className="surface-panel overflow-hidden rounded-lg">
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-300/0 via-sky-300/45 to-orange-300/0" />
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <CompanyAvatar
                name={company.name}
                website={company.website}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                  Client workspace
                </p>
                <h1 className="mt-1.5 truncate text-3xl font-semibold text-white">
                  {company.name}
                </h1>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-2 text-sm text-slate-400 transition hover:text-orange-200"
                  >
                    <Globe2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{hostname || company.website}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No website recorded.</p>
                )}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:min-w-[390px]">
              <div className="bg-slate-950/85 p-3.5">
                <p className="text-[11px] uppercase text-slate-500">Articles</p>
                <p className="mt-1 text-2xl font-semibold text-white">{articleTotal}</p>
              </div>
              <div className="border-x border-slate-800 bg-slate-950/85 p-3.5">
                <p className="text-[11px] uppercase text-slate-500">Assets</p>
                <p className="mt-1 text-2xl font-semibold text-white">{assetTotal}</p>
              </div>
              <div className="bg-slate-950/85 p-3.5">
                <p className="text-[11px] uppercase text-slate-500">Updated</p>
                <p className="mt-2 truncate text-xs font-semibold text-white">
                  {formatDate(company.updated_at || company.created_at)}
                </p>
              </div>
            </div>
          </div>

          {company.description && (
            <p className="mt-5 max-w-4xl border-t border-slate-800 pt-4 text-sm leading-6 text-slate-300">
              {company.description}
            </p>
          )}
        </div>
      </section>

      <CompanyTabs companyId={company.id} view={view} />

      {view === "overview" && (
        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <ArticlePanel
            articles={articles}
            companyId={company.id}
            totalCount={articleTotal}
            compact
          />
          <AssetPanel
            assets={assets}
            companyId={company.id}
            totalCount={assetTotal}
            compact
          />
        </div>
      )}
      {view === "articles" && (
        <ArticlePanel
          articles={articles}
          companyId={company.id}
          totalCount={articleTotal}
          page={articlePage}
          totalPages={articleTotalPages}
        />
      )}
      {view === "assets" && (
        <AssetPanel
          assets={assets}
          companyId={company.id}
          totalCount={assetTotal}
          page={assetPage}
          totalPages={assetTotalPages}
        />
      )}

      <section className="surface-panel rounded-lg p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client shortcuts
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Add knowledge and inventory directly to {company.name}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/articles/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <FilePlus2 className="h-4 w-4" />
              Create article
            </Link>
            <Link
              href={`/assets/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <Server className="h-4 w-4" />
              Add asset
            </Link>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
              >
                <ExternalLink className="h-4 w-4" />
                Open website
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
