import Link from "next/link";
import { ArrowRight, Pin, Tag } from "lucide-react";

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
      className="card-lift group relative block overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/0 to-transparent transition duration-300 group-hover:via-orange-300/50" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-700/0 to-transparent transition duration-300 group-hover:via-orange-500/20" />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white transition group-hover:text-orange-100">{article.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {article.company_name || "Internal"} · {article.category || "General"}
          </p>
        </div>

        {article.is_pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-300">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-400">
        {article.summary || "No summary yet."}
      </p>

      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(article.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/70 px-2 py-0.5 text-xs text-slate-400 transition group-hover:border-orange-500/20 group-hover:text-slate-300"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
      </div>
    </Link>
  );
}
