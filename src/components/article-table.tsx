import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Check,
  ChevronDown,
  FileText,
  Filter,
  LockKeyhole,
  Pin,
} from "lucide-react";

type Article = {
  id: string;
  title: string;
  company_id?: string | null;
  category?: string | null;
  summary?: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_pinned?: boolean | null;
  is_internal?: boolean | null;
  is_draft?: boolean | null;
};

type TableFilters = {
  q?: string;
  category?: string;
  visibility?: string;
  status?: string;
  companyId?: string;
  scope?: string;
  sort?: string;
  dir?: string;
};

type FilterOption = {
  label: string;
  value: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildHref(filters: TableFilters, changes: Partial<TableFilters>) {
  const params = new URLSearchParams();
  const next = { ...filters, ...changes };

  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/articles?${query}` : "/articles";
}

function nextSortHref(filters: TableFilters, sortKey: string) {
  const active = filters.sort === sortKey || (!filters.sort && sortKey === "updated");
  const nextDir = active && filters.dir !== "asc" ? "asc" : "desc";
  return buildHref(filters, { sort: sortKey, dir: nextDir });
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir?: string;
}) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5" />;
  return dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

function HeaderSortButton({
  filters,
  label,
  sortKey,
}: {
  filters: TableFilters;
  label: string;
  sortKey: string;
}) {
  const active = filters.sort === sortKey || (!filters.sort && sortKey === "updated");

  return (
    <Link
      href={nextSortHref(filters, sortKey)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${
        active
          ? "bg-orange-500/10 text-orange-200 ring-1 ring-orange-500/25"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      }`}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <SortIcon active={active} dir={filters.dir} />
    </Link>
  );
}

function HeaderFilterMenu({
  activeValue,
  filters,
  label,
  options,
  param,
}: {
  activeValue?: string;
  filters: TableFilters;
  label: string;
  options: FilterOption[];
  param: "category" | "status";
}) {
  return (
    <details className="group relative inline-block">
      <summary
        className={`inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded-lg px-2 transition marker:hidden [&::-webkit-details-marker]:hidden ${
          activeValue
            ? "bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/25"
            : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
        }`}
        title={`Filter ${label}`}
      >
        <Filter className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-8 z-20 min-w-44 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/40">
        {options.map((option) => {
          const active = activeValue === option.value || (!activeValue && option.value === "");

          return (
            <Link
              key={option.value || "all"}
              href={buildHref(filters, { [param]: option.value })}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-orange-500/10 text-orange-100"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span>{option.label}</span>
              {active ? <Check className="h-3.5 w-3.5" /> : null}
            </Link>
          );
        })}
      </div>
    </details>
  );
}

export default function ArticleTable({
  articles,
  categories,
  companyNames,
  filters,
}: {
  articles: Article[];
  categories: string[];
  companyNames: Record<string, string>;
  filters: TableFilters;
}) {
  const categoryOptions = [
    { label: "All categories", value: "" },
    ...categories.map((item) => ({ label: item, value: item })),
  ];
  const statusOptions = [
    { label: "All status", value: "" },
    { label: "Live", value: "published" },
    { label: "Draft", value: "draft" },
  ];

  return (
    <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Articles</p>
          <p className="mt-1 text-xs text-slate-500">
            {articles.length} matching record{articles.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="px-2 py-3 font-semibold">
                <HeaderSortButton filters={filters} label="Name" sortKey="name" />
              </th>
              <th className="px-2 py-3 font-semibold">
                <div className="flex items-center gap-1">
                  <HeaderSortButton filters={filters} label="Category" sortKey="category" />
                  <HeaderFilterMenu
                    activeValue={filters.category}
                    filters={filters}
                    label="category"
                    options={categoryOptions}
                    param="category"
                  />
                </div>
              </th>
              <th className="px-2 py-3 font-semibold">
                <HeaderSortButton filters={filters} label="Updated" sortKey="updated" />
              </th>
              <th className="px-2 py-3 font-semibold">
                <div className="flex items-center gap-1">
                  <HeaderSortButton filters={filters} label="Status" sortKey="status" />
                  <HeaderFilterMenu
                    activeValue={filters.status}
                    filters={filters}
                    label="status"
                    options={statusOptions}
                    param="status"
                  />
                </div>
              </th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No articles found.
                </td>
              </tr>
            )}

            {articles.map((article) => (
              <tr key={article.id} className="group bg-slate-950/60 transition hover:bg-slate-900/70">
                <td className="max-w-xl px-4 py-3">
                  <Link
                    href={`/articles/${article.id}`}
                    className="font-medium text-slate-100 transition hover:text-orange-200"
                  >
                    {article.title}
                  </Link>
                  {!filters.companyId && article.company_id ? (
                    <div className="mt-2">
                      <Link
                        href={`/companies/${article.company_id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-100 transition hover:border-sky-300/50 hover:text-white"
                        title="Client-specific knowledge base article"
                      >
                        <Building2 className="h-3 w-3" />
                        Client KB: {companyNames[article.company_id] || "Linked company"}
                      </Link>
                    </div>
                  ) : null}
                  {article.summary && (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {article.summary}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {article.category || "General"}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {formatDate(article.updated_at || article.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {article.is_draft ? (
                      <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200">
                        <FileText className="h-3 w-3" />
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                        Live
                      </span>
                    )}
                    {article.is_internal && (
                      <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
                        <LockKeyhole className="h-3 w-3" />
                        Internal
                      </span>
                    )}
                    {article.is_pinned && (
                      <span className="inline-flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/articles/${article.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition group-hover:bg-slate-800 group-hover:text-orange-300"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
