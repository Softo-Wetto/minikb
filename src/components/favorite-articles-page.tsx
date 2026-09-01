"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Search,
  Star,
  StarOff,
} from "lucide-react";
import type { FavoriteArticle } from "@/lib/article-favorites";
import {
  readFavoriteArticles,
  removeFavoriteArticle,
  selectFavoriteArticles,
  subscribeToFavoriteArticles,
} from "@/lib/article-favorites";

const emptyFavorites: FavoriteArticle[] = [];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FavoriteArticlesPage() {
  const items = useSyncExternalStore(
    subscribeToFavoriteArticles,
    readFavoriteArticles,
    () => emptyFavorites,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.category || "General"))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [items],
  );
  const visibleItems = selectFavoriteArticles(items, { category, query, sort });

  function removeFavorite(item: FavoriteArticle) {
    removeFavoriteArticle(item.id);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/articles"
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-orange-200"
      >
        <ArrowLeft className="h-4 w-4" />
        All articles
      </Link>

      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative border-b border-slate-800 bg-slate-900/35 px-5 py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/50 to-sky-300/0" />
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-300">
                <Star className="h-3.5 w-3.5 fill-orange-300/25" />
                Personal Library
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Favorite Articles
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Your saved central knowledge base articles, available without the sidebar limit.
              </p>
            </div>
            <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-right">
              <p className="text-2xl font-semibold text-orange-100">{items.length}</p>
              <p className="text-xs uppercase tracking-wide text-orange-300/80">
                Saved article{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-800 p-4 md:grid-cols-[minmax(0,1fr)_220px_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search favorites..."
              aria-label="Search favorite articles"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </label>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            aria-label="Filter favorites by category"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-10 rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            aria-label="Sort favorite articles"
          >
            <option value="newest">Recently favorited</option>
            <option value="oldest">Oldest favorited</option>
            <option value="title">Article title</option>
          </select>
        </div>

        <div className="p-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-16 text-center">
              <Star className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="mt-4 text-lg font-semibold text-white">Build your favorites library</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Open a central KB article and select Favorite to keep it close at hand.
              </p>
              <Link
                href="/articles?scope=central"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                Browse central KB
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-6 py-14 text-center">
              <Search className="mx-auto h-7 w-7 text-slate-600" />
              <h2 className="mt-3 text-base font-semibold text-white">No matching favorites</h2>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                }}
                className="mt-4 text-sm font-semibold text-orange-300 transition hover:text-orange-200"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 text-orange-300" />
                  <p className="text-sm font-semibold text-white">Saved knowledge</p>
                </div>
                <p className="text-xs text-slate-500">
                  {visibleItems.length} matching article{visibleItems.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="divide-y divide-slate-800">
                {visibleItems.map((item) => (
                  <article
                    key={item.id}
                    className="group grid gap-3 px-4 py-4 transition hover:bg-slate-900/70 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/articles/${item.id}`}
                        className="block truncate text-sm font-semibold text-slate-100 transition hover:text-orange-200"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-slate-300">
                          {item.category || "General"}
                        </span>
                        <span>Favorited {formatDate(item.favoritedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/articles/${item.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-white"
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFavorite(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-200"
                        title={`Remove ${item.title} from favorites`}
                        aria-label={`Remove ${item.title} from favorites`}
                      >
                        <StarOff className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
