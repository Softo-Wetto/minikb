"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { History } from "lucide-react";
import type { RecentArticle } from "@/lib/recent-articles";
import {
  readRecentArticles,
  subscribeToRecentArticles,
} from "@/lib/recent-articles";

const emptyRecentArticles: RecentArticle[] = [];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

export default function RecentViews() {
  const items = useSyncExternalStore(
    subscribeToRecentArticles,
    readRecentArticles,
    () => emptyRecentArticles
  );

  return (
    <section className="surface-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Recently Viewed</h2>
          <p className="mt-1 text-xs text-slate-500">Stored locally in this browser.</p>
        </div>
        <History className="h-4 w-4 text-orange-300" />
      </div>

      <div className="space-y-1.5 p-3">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
            Open an article to build your history.
          </p>
        )}

        {items.map((item) => (
          <Link
            key={item.id}
            href={`/articles/${item.id}`}
            className="group kb-interactive-row flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-300"
          >
            <span className="truncate">{item.title}</span>
            <span className="shrink-0 text-xs text-slate-600 transition group-hover:text-slate-500">
              {formatDate(item.viewedAt)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
