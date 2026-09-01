import Link from "next/link";
import { settleConcurrent } from "@/lib/concurrent-loaders";
import { FilePlus2, Filter, FolderCog, Search, Star } from "lucide-react";
import KbCategoryList from "@/components/kb-category-list";
import ArticleTable from "@/components/article-table";
import FavoriteArticles from "@/components/favorite-articles";
import { getArticleFolderOptions } from "@/lib/article-folders";
import {
  equalsFilter,
  getRecords,
  searchFilter,
} from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import type { Article, Company } from "@/types/database";

type SearchParams = Promise<{
  q?: string;
  category?: string;
  tag?: string;
  visibility?: string;
  status?: string;
  companyId?: string;
  scope?: string;
  sort?: string;
  dir?: string;
}>;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();

  const {
    q = "",
    category = "",
    tag = "",
    visibility = "",
    status = "",
    companyId = "",
    scope = "all",
    sort = "updated",
    dir = "desc",
  } = await searchParams;
  const filters: string[] = [];

  if (q.trim()) {
    filters.push(`(${searchFilter(["title", "summary", "content"], q.trim())})`);
  }

  if (category.trim()) filters.push(equalsFilter("category", category));
  const useSingleCompany = companyId.trim() && (scope === "single" || scope === "all");

  if (useSingleCompany) {
    filters.push(equalsFilter("company_id", companyId));
  } else if (scope === "central") {
    filters.push('company_id = ""');
  } else if (scope === "clients") {
    filters.push('company_id != ""');
  }
  if (visibility === "internal") filters.push("is_internal = true");
  if (visibility === "public") filters.push("is_internal = false");
  if (status === "draft") filters.push("is_draft = true");
  if (status === "published") filters.push("is_draft = false");

  const sortMap: Record<string, string> = {
    name: "title",
    category: "category",
    updated: "updated_at",
    status: "is_draft",
  };
  const sortField = sortMap[sort] ?? "updated_at";
  const sortDirection = dir === "asc" ? "" : "-";

  let articles: Article[] = [];
  let companyRows: Pick<Company, "id" | "name">[] = [];
  let error: Error | null = null;

  const [articleResult, companyResult, folderResult] = await settleConcurrent([
    () => getRecords<Article>("articles", {
      fields: "id,title,category,summary,tags,company_id,created_at,updated_at,is_pinned,is_internal,is_draft",
      sort: `${sortDirection}${sortField}`,
      filter: filters.join(" && "),
    }),
    () => getRecords<Company>("companies", {
      fields: "id,name",
      sort: "name",
      perPage: 500,
    }),
    () => getArticleFolderOptions(),
  ]);

  if (articleResult.status === "fulfilled") {
    articles = tag
      ? articleResult.value.items.filter((article) => article.tags?.includes(tag))
      : articleResult.value.items;
  } else {
    error = articleResult.reason as Error;
  }

  companyRows = companyResult.status === "fulfilled"
    ? companyResult.value.items.map((company) => ({
        id: company.id,
        name: company.name,
      }))
    : [];
  const folders = folderResult.status === "fulfilled" ? folderResult.value : [];
  const categories = folders.map((folder) => folder.name);
  const availableTags = Array.from(new Set(articles.flatMap((article) => article.tags || []))).sort((left, right) => left.localeCompare(right));
  const pageScopeLabel = useSingleCompany
    ? "Single Client Knowledge Base"
    : scope === "central"
      ? "Central Knowledge Base"
      : scope === "clients"
        ? "All Client Knowledge Bases"
        : "All Knowledge Bases";
  const formScope = companyId && scope !== "central" && scope !== "clients" ? "single" : scope;
  const formCompanyId = formScope === "single" ? companyId : "";

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/35 px-5 py-5 lg:flex-row lg:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/40 to-sky-300/0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              {pageScopeLabel}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Articles
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Search procedures, notes, runbooks, and internal documentation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/articles/favorites"
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/5 px-3 text-sm font-semibold text-orange-100 transition hover:border-orange-400/60 hover:bg-orange-500/10"
            >
              <Star className="h-4 w-4 fill-orange-300/15 text-orange-300" />
              Favorites
            </Link>

            <Link
              href="/articles/folders"
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-100 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <FolderCog className="h-4 w-4" />
              Manage Folders
            </Link>

            <Link
              href="/articles/new"
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/25 transition hover:from-orange-400 hover:to-amber-400"
            >
              <FilePlus2 className="h-4 w-4" />
              New Article
            </Link>
          </div>
        </div>

        <div className="border-b border-slate-800 p-4">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_190px_220px_160px_170px_160px_130px]">
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />

            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search articles..."
                className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
              />
            </label>

            <select
              name="scope"
              defaultValue={formScope}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="all">All KBs</option>
              <option value="central">Central KB only</option>
              <option value="clients">All client KBs</option>
              <option value="single">Single client KB</option>
            </select>

            <select
              name="companyId"
              defaultValue={formCompanyId}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="">Select client</option>
              {companyRows.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              name="tag"
              defaultValue={tag}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="">All Tags</option>
              {availableTags.map((item) => (
                <option key={item} value={item}>
                  #{item}
                </option>
              ))}
            </select>

            <select
              name="category"
              defaultValue={category}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              name="visibility"
              defaultValue={visibility}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="">All Visibility</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>

            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 transition hover:border-orange-500/60 hover:text-white"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </form>
        </div>

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error.message}
          </div>
        )}

        <div className="grid gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <FavoriteArticles />
            <section className="rounded border border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Tag Explorer</p>
                  <p className="mt-1 text-xs text-slate-500">Your personal map across central and client knowledge.</p>
                </div>
                <span className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-400">{availableTags.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3">
                {availableTags.length === 0 && <p className="text-sm text-slate-500">Add tags while editing an article to build your map.</p>}
                {availableTags.map((item) => (
                  <Link
                    key={item}
                    href={`/articles?tag=${encodeURIComponent(item)}`}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      tag === item
                        ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-500/40 hover:text-orange-200"
                    }`}
                  >
                    #{item}
                  </Link>
                ))}
              </div>
            </section>
            <KbCategoryList articles={articles} folderOrder={categories} />
          </div>
          <ArticleTable
            articles={articles}
            categories={categories}
            companyNames={Object.fromEntries(companyRows.map((company) => [company.id, company.name]))}
            filters={{ q, category, tag, visibility, status, companyId, scope, sort, dir }}
          />
        </div>
      </section>
    </div>
  );
}
