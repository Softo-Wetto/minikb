"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, Star } from "lucide-react";
import type { FavoriteArticle } from "@/lib/article-favorites";
import {
  readFavoriteArticles,
  subscribeToFavoriteArticles,
} from "@/lib/article-favorites";

const emptyFavorites: FavoriteArticle[] = [];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
  });
}

export default function FavoriteArticles() {
  const items = useSyncExternalStore(
    subscribeToFavoriteArticles,
    readFavoriteArticles,
    () => emptyFavorites
  );

  return (
    <section className="surface-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Favorite Articles</h2>
          <p className="mt-1 text-xs text-slate-500">Central KB shortcuts stored in this browser.</p>
        </div>
        <Star className="h-4 w-4 fill-orange-300/20 text-orange-300" />
      </div>

      <div className="space-y-1.5 p-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No favorite central articles yet.</p>
            <p className="mt-2 text-xs text-slate-600">Open a central KB article and use the star action.</p>
          </div>
        )}

        {items.map((item) => (
          <Link
            key={item.id}
            href={`/articles/${item.id}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-300 transition hover:border-orange-500/20 hover:bg-orange-500/[0.07] hover:text-orange-100"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.title}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-600">
                {item.category || "General"} - favorited {formatDate(item.favoritedAt)}
              </span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
