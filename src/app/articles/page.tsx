import Link from "next/link";
import { FilePlus2, Filter, FolderCog, Search } from "lucide-react";
import KbCategoryList from "@/components/kb-category-list";
import ArticleTable from "@/components/article-table";
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
  visibility?: string;
  status?: string;
  companyId?: string;
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
    visibility = "",
    status = "",
    companyId = "",
    sort = "updated",
    dir = "desc",
  } = await searchParams;
  const filters: string[] = [];

  if (q.trim()) {
    filters.push(`(${searchFilter(["title", "summary", "content"], q.trim())})`);
  }

  if (category.trim()) filters.push(equalsFilter("category", category));
  if (companyId.trim()) filters.push(equalsFilter("company_id", companyId));
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

  try {
    const response = await getRecords<Article>("articles", {
      fields: "id,title,category,summary,company_id,created_at,updated_at,is_pinned,is_internal,is_draft",
      sort: `${sortDirection}${sortField}`,
      filter: filters.join(" && "),
    });
    articles = response.items;
  } catch (caught) {
    error = caught as Error;
  }

  try {
    const response = await getRecords<Company>("companies", {
      fields: "id,name",
      sort: "name",
      perPage: 500,
    });
    companyRows = response.items.map((company) => ({
      id: company.id,
      name: company.name,
    }));
  } catch {
    companyRows = [];
  }

  const folders = await getArticleFolderOptions();
  const categories = folders.map((folder) => folder.name);

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/35 px-5 py-5 lg:flex-row lg:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/40 to-sky-300/0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              {companyId ? "Client Knowledge Base" : "Central Knowledge Base"}
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
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_170px_130px]">
            {companyId && <input type="hidden" name="companyId" value={companyId} />}
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
          <KbCategoryList articles={articles} folderOrder={categories} />
          <ArticleTable
            articles={articles}
            categories={categories}
            companyNames={Object.fromEntries(companyRows.map((company) => [company.id, company.name]))}
            filters={{ q, category, visibility, status, companyId, sort, dir }}
          />
        </div>
      </section>
    </div>
  );
}
