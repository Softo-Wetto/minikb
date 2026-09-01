import assert from "node:assert/strict";
import test from "node:test";
import type { FavoriteArticle } from "./article-favorites.ts";
import {
  readFavoriteArticles,
  removeFavoriteArticle,
  selectFavoriteArticles,
  toggleFavoriteArticle,
} from "./article-favorites.ts";


function createBrowserStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
  const browser = Object.assign(new EventTarget(), { localStorage: storage });

  return browser as unknown as Window & typeof globalThis;
}

test("retains every favorite instead of discarding entries after twelve", () => {
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: createBrowserStorage() });

  try {
    for (let index = 1; index <= 15; index += 1) {
      toggleFavoriteArticle({
        id: `article-${index}`,
        title: `Article ${index}`,
        category: "General",
      });
    }

    assert.equal(readFavoriteArticles().length, 15);
    assert.equal(readFavoriteArticles()[0]?.id, "article-15");
    assert.equal(readFavoriteArticles()[14]?.id, "article-1");
  } finally {
    Object.assign(globalThis, { window: previousWindow });
  }
});

test("selects a compact or filtered favorite collection without changing its input", () => {
  const items: FavoriteArticle[] = [
    { id: "3", title: "VPS Backup", category: "Operations", favoritedAt: "2026-08-03T00:00:00Z" },
    { id: "1", title: "Email Backup", category: "Operations", favoritedAt: "2026-08-01T00:00:00Z" },
    { id: "2", title: "Firewall Rules", category: "Security", favoritedAt: "2026-08-02T00:00:00Z" },
  ];

  const selected = selectFavoriteArticles(items, {
    category: "Operations",
    limit: 1,
    query: "backup",
    sort: "title",
  });

  assert.deepEqual(selected.map((item) => item.id), ["1"]);
  assert.deepEqual(items.map((item) => item.id), ["3", "1", "2"]);
});

test("removing a favorite is idempotent when the article is already absent", () => {
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: createBrowserStorage() });

  try {
    toggleFavoriteArticle({ id: "article-1", title: "Article 1", category: "General" });
    removeFavoriteArticle("article-1");
    removeFavoriteArticle("article-1");

    assert.deepEqual(readFavoriteArticles(), []);
  } finally {
    Object.assign(globalThis, { window: previousWindow });
  }
});
