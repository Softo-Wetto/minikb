import Link from "next/link";
import { Pin, Tag } from "lucide-react";

type Article = {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  company_name: string | null;
  tags: string[] | null;
  is_pinned: boolean | null;
  updated_at: string;
};

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="block rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:bg-white/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{article.title}</p>
          <p className="mt-1 text-sm text-slate-400">
            {article.company_name || "Internal"} • {article.category || "General"}
          </p>
        </div>

        {article.is_pinned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-1 text-xs text-yellow-300">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-3 text-sm text-slate-300">
        {article.summary || "No summary yet."}
      </p>

      <div className="flex flex-wrap gap-2">
        {(article.tags || []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-300"
          >
            <Tag className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}