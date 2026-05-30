"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";

type Article = {
  id: string;
  title: string;
  category: string | null;
  summary?: string | null;
};

export default function KbCategoryList({ articles }: { articles: Article[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; count: number; articles: Article[] }>();

    for (const article of articles) {
      const name = article.category?.trim() || "General";
      if (!map.has(name)) map.set(name, { name, count: 0, articles: [] });
      const group = map.get(name)!;
      group.count += 1;
      group.articles.push(article);
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [articles]);

  const [open, setOpen] = useState<Record<string, boolean>>(
    grouped[0] ? { [grouped[0].name]: true } : {}
  );

  function toggle(name: string) {
    setOpen((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Knowledge Categories</p>
          <p className="mt-1 text-xs text-slate-500">
            Grouped by article folder/category.
          </p>
        </div>
        <span className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-400">
          {grouped.length}
        </span>
      </div>

      {grouped.length === 0 && (
        <div className="px-4 py-6 text-sm text-slate-400">No categories yet.</div>
      )}

      <div className="divide-y divide-slate-800">
        {grouped.map((group) => {
          const isOpen = !!open[group.name];

          return (
            <div key={group.name}>
              <button
                onClick={() => toggle(group.name)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-900/70"
              >
                <ChevronRight
                  className={`h-4 w-4 text-slate-500 transition ${isOpen ? "rotate-90" : ""}`}
                />
                <Folder className="h-4 w-4 text-orange-300" />
                <span className="font-medium">{group.name}</span>
                <span className="ml-auto rounded bg-slate-900 px-2 py-0.5 text-xs text-slate-400">
                  {group.count}
                </span>
              </button>

              {isOpen && (
                <div className="animate-slide-down space-y-1 bg-slate-950/70 px-10 pb-3">
                  {group.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/articles/${article.id}`}
                      className="block truncate rounded px-2 py-1.5 text-xs text-slate-400 transition hover:bg-slate-900 hover:text-orange-200"
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
