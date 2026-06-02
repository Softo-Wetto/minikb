import Link from "next/link";
import { ArrowRight, FileText, LockKeyhole, Pin } from "lucide-react";

type Article = {
  id: string;
  title: string;
  category?: string | null;
  summary?: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_pinned?: boolean | null;
  is_internal?: boolean | null;
  is_draft?: boolean | null;
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

export default function ArticleTable({ articles }: { articles: Article[] }) {
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
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Status</th>
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
