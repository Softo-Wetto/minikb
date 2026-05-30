"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { History } from "lucide-react";

type RecentArticle = {
  id: string;
  title: string;
  viewedAt: string;
};

let cachedStored = "";
let cachedItems: RecentArticle[] = [];
const emptyRecentArticles: RecentArticle[] = [];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

function readRecentArticles() {
  if (typeof window === "undefined") return emptyRecentArticles;

  const stored = window.localStorage.getItem("minikb_recent_articles");
  if (!stored) {
    cachedStored = "";
    cachedItems = emptyRecentArticles;
    return emptyRecentArticles;
  }
  if (stored === cachedStored) return cachedItems;

  try {
    cachedStored = stored;
    cachedItems = JSON.parse(stored) as RecentArticle[];
    return cachedItems;
  } catch {
    cachedStored = stored;
    cachedItems = emptyRecentArticles;
    return emptyRecentArticles;
  }
}

function subscribeToRecentArticles(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("minikb-recent-articles", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("minikb-recent-articles", onStoreChange);
  };
}

export default function RecentViews() {
  const items = useSyncExternalStore(
    subscribeToRecentArticles,
    readRecentArticles,
    () => emptyRecentArticles
  );

  return (
    <section className="rounded border border-slate-800 bg-slate-950/80">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <History className="h-4 w-4 text-orange-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Recently Viewed</h2>
          <p className="mt-1 text-xs text-slate-500">Stored locally in this browser.</p>
        </div>
      </div>

      <div className="space-y-1 p-3">
        {items.length === 0 && (
          <p className="rounded border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
            Open an article to build your history.
          </p>
        )}

        {items.map((item) => (
          <Link
            key={item.id}
            href={`/articles/${item.id}`}
            className="flex items-center justify-between gap-3 rounded px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-orange-200"
          >
            <span className="truncate">{item.title}</span>
            <span className="shrink-0 text-xs text-slate-600">
              {formatDate(item.viewedAt)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
