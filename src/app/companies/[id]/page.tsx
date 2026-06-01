import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  CalendarClock,
  ExternalLink,
  FilePlus2,
  HardDrive,
  Plus,
  Server,
} from "lucide-react";
import {
  equalsFilter,
  getRecord,
  getRecords,
} from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import type { Article, Asset, Company } from "@/types/database";

function assetTypeLabel(value?: string | null) {
  return (value || "asset")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();

  const { id } = await params;
  let company: Company | null = null;
  let articles: Article[] = [];
  let assets: Asset[] = [];

  try {
    company = await getRecord<Company>("companies", id);
  } catch {
    company = null;
  }

  if (company) {
    try {
      const response = await getRecords<Article>("articles", {
        filter: equalsFilter("company_id", company.id),
        sort: "-updated_at",
      });
      articles = response.items;
    } catch {
      articles = [];
    }

    try {
      const response = await getRecords<Asset>("assets", {
        filter: equalsFilter("company_id", company.id),
        sort: "-updated_at",
      });
      assets = response.items;
    } catch {
      assets = [];
    }
  }

  if (!company) {
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-8 text-slate-300">
        Company not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Companies
        </Link>

        {canEdit(profile.role) && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/articles/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <FilePlus2 className="h-4 w-4" />
              New Article
            </Link>
            <Link
              href={`/assets/new?companyId=${company.id}`}
              className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              <Plus className="h-4 w-4" />
              New Asset
            </Link>
          </div>
        )}
      </div>

      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative border-b border-slate-800 bg-slate-950/75 px-5 py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-300/0 via-sky-300/45 to-orange-300/0" />
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-orange-500 text-lg font-black text-white shadow-lg shadow-sky-950/30">
                {company.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                  Client Workspace
                </p>
                <h1 className="mt-2 truncate text-3xl font-semibold text-white">
                  {company.name}
                </h1>
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-orange-200 transition hover:text-orange-100"
                  >
                    {company.website}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">No website recorded.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                <p className="text-xs text-slate-500">Articles</p>
                <p className="mt-1 text-2xl font-semibold text-white">{articles.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                <p className="text-xs text-slate-500">Assets</p>
                <p className="mt-1 text-2xl font-semibold text-white">{assets.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
                <p className="text-xs text-slate-500">Updated</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDate(company.updated_at || company.created_at)}
                </p>
              </div>
            </div>
          </div>

          {company.description && (
            <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-300">
              {company.description}
            </p>
          )}
        </div>

        <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div
            id="articles"
            className="surface-card scroll-mt-20 rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-orange-300" />
                <h2 className="text-sm font-semibold text-white">
                  Knowledge Base ({articles.length})
                </h2>
              </div>
              <Link
                href={`/articles?companyId=${company.id}`}
                className="text-xs font-semibold text-slate-400 transition hover:text-orange-200"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-800">
              {articles.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No client articles yet.
                </div>
              )}
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-orange-200"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-100">
                      {article.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {article.category || "General"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDate(article.updated_at || article.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div
            id="assets"
            className="surface-card scroll-mt-20 rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-orange-300" />
                <h2 className="text-sm font-semibold text-white">
                  Assets ({assets.length})
                </h2>
              </div>
              <Link
                href={`/assets?companyId=${company.id}`}
                className="text-xs font-semibold text-slate-400 transition hover:text-orange-200"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-800">
              {assets.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  No linked assets.
                </div>
              )}
              {assets.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-900"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-950 text-orange-300 ring-1 ring-slate-800">
                    <HardDrive className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {asset.name}
                    </span>
                    <span className="mt-1 block text-xs uppercase text-slate-500">
                      {assetTypeLabel(asset.asset_type)}
                    </span>
                  </span>
                  <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs text-slate-500 sm:inline-flex">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(asset.updated_at || asset.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="surface-card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client Shortcuts
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/articles/new?companyId=${company.id}`}
                className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
              >
                <FilePlus2 className="h-4 w-4" />
                Create article for {company.name}
              </Link>
              <Link
                href={`/assets/new?companyId=${company.id}`}
                className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
              >
                <Server className="h-4 w-4" />
                Add asset
              </Link>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
