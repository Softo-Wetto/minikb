import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInThisContext } from "node:vm";
import React from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";
import type { FavoriteArticle } from "./article-favorites.ts";
import * as favorites from "./article-favorites.ts";
import {
  favoriteArticlesEvent,
  favoriteArticlesKey,
  isFavoriteArticle,
  readFavoriteArticles,
  removeFavoriteArticle,
  selectFavoriteArticles,
  subscribeToFavoriteArticles,
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
    removeItem(key: string) {
      values.delete(key);
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

function withBrowser(run: (browser: Window & typeof globalThis) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = createBrowserStorage();
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    run(browser);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

const savedArticle: FavoriteArticle = {
  id: "saved-1",
  title: "Backup guide",
  category: "Operations",
  favoritedAt: "2026-10-01T00:00:00.000Z",
};

for (const stored of ["{", "null", "{}", '"text"', "42", "true"]) {
  test(`treats invalid favorite storage ${stored} as a stable empty snapshot`, () => {
    withBrowser((browser) => {
      browser.localStorage.setItem(favoriteArticlesKey, stored);
      const snapshot = readFavoriteArticles();
      assert.deepEqual(snapshot, []);
      assert.strictEqual(readFavoriteArticles(), snapshot);
      assert.equal(isFavoriteArticle("saved-1"), false);
      assert.deepEqual(selectFavoriteArticles(snapshot, { query: "backup" }), []);
      assert.equal(toggleFavoriteArticle(savedArticle), true);
      assert.equal(readFavoriteArticles().length, 1);
    });
  });
}

test("drops malformed favorites while retaining valid records and optional categories", () => {
  withBrowser((browser) => {
    const uncategorized = { ...savedArticle, id: "saved-2", category: null };
    const missingCategory = { ...savedArticle, id: "saved-3" };
    delete missingCategory.category;
    browser.localStorage.setItem(favoriteArticlesKey, JSON.stringify([
      null, false, 9, "entry", {}, [],
      { ...savedArticle, id: 1 },
      { ...savedArticle, id: " " },
      { ...savedArticle, title: null },
      { ...savedArticle, title: " " },
      { ...savedArticle, category: {} },
      { ...savedArticle, favoritedAt: null },
      { ...savedArticle, favoritedAt: "not-a-date" },
      savedArticle, uncategorized, missingCategory,
    ]));
    const snapshot = readFavoriteArticles();
    assert.deepEqual(snapshot, [savedArticle, uncategorized, missingCategory]);
    assert.strictEqual(readFavoriteArticles(), snapshot);
    assert.equal(selectFavoriteArticles(snapshot, { query: "backup" }).length, 3);
    assert.equal(removeFavoriteArticle("saved-1"), true);
    assert.deepEqual(readFavoriteArticles(), [uncategorized, missingCategory]);
  });
});

test("invalidates the favorite snapshot after storage deletion and external changes", () => {
  withBrowser((browser) => {
    const stored = JSON.stringify([savedArticle]);
    browser.localStorage.setItem(favoriteArticlesKey, stored);
    const first = readFavoriteArticles();
    assert.strictEqual(readFavoriteArticles(), first);
    browser.localStorage.removeItem(favoriteArticlesKey);
    const empty = readFavoriteArticles();
    assert.deepEqual(empty, []);
    assert.strictEqual(readFavoriteArticles(), empty);
    browser.localStorage.setItem(favoriteArticlesKey, stored);
    assert.deepEqual(readFavoriteArticles(), [savedArticle]);
    assert.notStrictEqual(readFavoriteArticles(), first);
    browser.localStorage.setItem(favoriteArticlesKey, JSON.stringify([{ ...savedArticle, title: "Updated" }]));
    assert.equal(readFavoriteArticles()[0]?.title, "Updated");
  });
});

for (const failure of ["access", "read", "write"] as const) {
  test(`handles favorite storage ${failure} failures without overwriting or publishing a change`, () => {
    withBrowser((browser) => {
      browser.localStorage.setItem(favoriteArticlesKey, JSON.stringify([savedArticle]));
      const snapshot = readFavoriteArticles();
      const storage = browser.localStorage;
      const descriptor = Object.getOwnPropertyDescriptor(browser, "localStorage")!;
      const getItem = storage.getItem;
      const setItem = storage.setItem;
      const fail = () => { throw new Error("Storage blocked"); };
      let events = 0;
      const unsubscribe = subscribeToFavoriteArticles(() => { events += 1; });
      if (failure === "access") Object.defineProperty(browser, "localStorage", { configurable: true, get: fail });
      if (failure === "read") storage.getItem = fail;
      if (failure === "write") storage.setItem = fail;
      try {
        assert.strictEqual(readFavoriteArticles(), readFavoriteArticles());
        assert.equal(removeFavoriteArticle(savedArticle.id), false);
        assert.equal(toggleFavoriteArticle({ id: "new", title: "New article" }), false);
        assert.equal(events, 0);
      } finally {
        Object.defineProperty(browser, "localStorage", descriptor);
        storage.getItem = getItem;
        storage.setItem = setItem;
        unsubscribe();
      }
      assert.strictEqual(readFavoriteArticles(), snapshot);
      assert.deepEqual(JSON.parse(storage.getItem(favoriteArticlesKey)!), [savedArticle]);
    });
  });
}

test("publishes persisted favorite changes and unsubscribes from both existing events", () => {
  withBrowser((browser) => {
    const snapshots: FavoriteArticle[][] = [];
    const unsubscribe = subscribeToFavoriteArticles(() => { snapshots.push(readFavoriteArticles()); });
    assert.equal(toggleFavoriteArticle(savedArticle), true);
    assert.deepEqual(snapshots[0]?.map((item) => item.id), ["saved-1"]);
    assert.strictEqual(snapshots[0], readFavoriteArticles());
    assert.deepEqual(JSON.parse(browser.localStorage.getItem("minikb_favorite_articles")!)[0].id, "saved-1");
    browser.dispatchEvent(new Event("storage"));
    browser.dispatchEvent(new Event("minikb-favorite-articles"));
    assert.equal(snapshots.length, 3);
    assert.equal(toggleFavoriteArticle(savedArticle), false);
    assert.deepEqual(snapshots.at(-1), []);
    assert.equal(removeFavoriteArticle("absent"), false);
    assert.equal(snapshots.length, 4);
    unsubscribe();
    browser.dispatchEvent(new Event("storage"));
    browser.dispatchEvent(new Event(favoriteArticlesEvent));
    assert.equal(snapshots.length, 4);
  });
});

// Transpile the real TSX in memory so the Node suite needs no browser or new runner.
function loadArticleUtilities(react: object = React) {
  const require = createRequire(import.meta.url);
  const { outputText } = ts.transpileModule(
    readFileSync(new URL("../components/article-utilities.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  );
  const componentModule = { exports: {} as { default: React.ComponentType<{ articleId: string; title: string }> } };
  runInThisContext(`(function(require, module, exports) {${outputText}\n})`)(
    (id: string) => {
      if (id === "react") return react;
      if (id === "@/lib/article-favorites") return favorites;
      if (id.startsWith("@/lib/")) return require(`./${id.slice("@/lib/".length)}.ts`);
      return require(id);
    },
    componentModule,
    componentModule.exports,
  );
  return componentModule.exports.default;
}

test("renders the same favorite button on the server even when the browser has a saved favorite", () => {
  const ArticleUtilities = loadArticleUtilities();
  const props = { articleId: "saved-1", title: "Backup guide" };
  const serverHtml = renderToString(React.createElement(ArticleUtilities, props));
  withBrowser((browser) => {
    browser.localStorage.setItem(favoriteArticlesKey, JSON.stringify([savedArticle]));
    assert.equal(isFavoriteArticle("saved-1"), true);
    const hydrationHtml = renderToString(React.createElement(ArticleUtilities, props));
    assert.equal(hydrationHtml, serverHtml);
    assert.doesNotMatch(hydrationHtml, />Favorited</);
  });
});

test("collects H1 through H5 headings with usable anchors and skips empty headings", () => {
  withBrowser((browser) => {
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const nodes = [
      { tagName: "H1", textContent: "Overview", id: "existing-anchor" },
      { tagName: "H2", textContent: "Setup", id: "" },
      { tagName: "H3", textContent: "Details", id: "" },
      { tagName: "H4", textContent: "  Deep Setup  ", id: "" },
      { tagName: "H5", textContent: "Final checks", id: "" },
      { tagName: "H5", textContent: " ", id: "" },
      { tagName: "H6", textContent: "Unsupported", id: "" },
    ];
    const effects: (() => void)[] = [];
    const updates: unknown[] = [];
    Object.defineProperty(globalThis, "document", { configurable: true, value: {
      querySelectorAll(selector: string) {
        const selectors = selector.split(",").map((part) => part.trim());
        return nodes.filter((node) => selectors.includes(`.article-content ${node.tagName.toLowerCase()}`));
      },
    } });
    browser.requestAnimationFrame = (callback) => { callback(0); return 1; };
    try {
      const ArticleUtilities = loadArticleUtilities({
        ...React,
        useEffect(effect: () => void) { effects.push(effect); },
        useState(value: unknown) { return [value, (next: unknown) => { updates.push(next); }]; },
        useSyncExternalStore(_subscribe: unknown, _read: unknown, serverSnapshot: () => unknown) {
          return serverSnapshot();
        },
      });
      (ArticleUtilities as (props: { articleId: string; title: string }) => unknown)({ articleId: "toc", title: "TOC" });
      effects[1]();
      assert.deepEqual(updates, [[
        { id: "existing-anchor", text: "Overview", level: 1 },
        { id: "setup-1", text: "Setup", level: 2 },
        { id: "details-2", text: "Details", level: 3 },
        { id: "deep-setup-3", text: "Deep Setup", level: 4 },
        { id: "final-checks-4", text: "Final checks", level: 5 },
      ]]);
      assert.equal(nodes[3].id, "deep-setup-3");
      assert.equal(nodes[4].id, "final-checks-4");
    } finally {
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });
});

for (const stored of ["{", "null", "{}", "[null,{}]"]) {
  test(`opening an article repairs malformed recent history ${stored} without crashing`, () => {
    withBrowser((browser) => {
      browser.localStorage.setItem("minikb_recent_articles", stored);
      const effects: (() => void)[] = [];
      const ArticleUtilities = loadArticleUtilities({
        ...React,
        useEffect(effect: () => void) { effects.push(effect); },
        useState(value: unknown) { return [value, () => {}]; },
        useSyncExternalStore(_subscribe: unknown, _read: unknown, serverSnapshot: () => unknown) {
          return serverSnapshot();
        },
      });
      (ArticleUtilities as (props: { articleId: string; title: string }) => unknown)({ articleId: "opened", title: "Opened article" });
      effects[0]();
      const storedHistory = JSON.parse(browser.localStorage.getItem("minikb_recent_articles")!);
      assert.equal(storedHistory.length, 1);
      assert.equal(storedHistory[0].id, "opened");
      assert.equal(storedHistory[0].title, "Opened article");
      assert.ok(Number.isFinite(Date.parse(storedHistory[0].viewedAt)));
    });
  });
}

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
