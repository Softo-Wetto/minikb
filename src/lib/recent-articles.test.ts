import assert from "node:assert/strict";
import test from "node:test";
import {
  readRecentArticles,
  recordRecentArticle,
  recentArticlesEvent,
  recentArticlesKey,
  subscribeToRecentArticles,
} from "./recent-articles.ts";

function createBrowser() {
  const values = new Map<string, string>();
  return Object.assign(new EventTarget(), {
    localStorage: {
      getItem(key: string) { return values.get(key) ?? null; },
      setItem(key: string, value: string) { values.set(key, value); },
      removeItem(key: string) { values.delete(key); },
    },
  });
}

function withBrowser(run: (browser: ReturnType<typeof createBrowser>) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = createBrowser();
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  try {
    run(browser);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

const viewedArticle = { id: "viewed-1", title: "Viewed article", viewedAt: "2026-10-01T00:00:00.000Z" };

for (const stored of ["{", "null", "{}", '"text"', "42", "true"]) {
  test(`treats invalid recent history ${stored} as a stable empty snapshot`, () => {
    withBrowser((browser) => {
      browser.localStorage.setItem(recentArticlesKey, stored);
      const snapshot = readRecentArticles();
      assert.deepEqual(snapshot, []);
      assert.strictEqual(readRecentArticles(), snapshot);
      assert.equal(recordRecentArticle({ id: "new", title: "New article" }), true);
      assert.deepEqual(readRecentArticles().map((item) => item.id), ["new"]);
    });
  });
}

test("filters malformed recent records without discarding valid history", () => {
  withBrowser((browser) => {
    const stored = JSON.stringify([
      null, false, "entry", 8, {}, [],
      { ...viewedArticle, id: null },
      { ...viewedArticle, id: " " },
      { ...viewedArticle, title: {} },
      { ...viewedArticle, title: " " },
      { ...viewedArticle, viewedAt: 12 },
      { ...viewedArticle, viewedAt: "not-a-date" },
      viewedArticle,
    ]);
    browser.localStorage.setItem(recentArticlesKey, stored);
    assert.deepEqual(readRecentArticles(), [viewedArticle]);
    assert.equal(browser.localStorage.getItem(recentArticlesKey), stored);
    assert.equal(recordRecentArticle({ id: "opened", title: "Opened article" }), true);
    assert.deepEqual(readRecentArticles().map((item) => item.id), ["opened", "viewed-1"]);
  });
});

test("keeps the latest eight visits and moves a revisited article to the front", () => {
  withBrowser((browser) => {
    for (let index = 1; index <= 10; index += 1) {
      assert.equal(recordRecentArticle({ id: `article-${index}`, title: `Article ${index}` }), true);
    }
    assert.deepEqual(readRecentArticles().map((item) => item.id), [
      "article-10", "article-9", "article-8", "article-7", "article-6", "article-5", "article-4", "article-3",
    ]);
    const before = Date.now();
    recordRecentArticle({ id: "article-6", title: "Updated title" });
    const snapshot = readRecentArticles();
    assert.deepEqual(snapshot.map((item) => item.id), [
      "article-6", "article-10", "article-9", "article-8", "article-7", "article-5", "article-4", "article-3",
    ]);
    assert.equal(snapshot[0].title, "Updated title");
    assert.ok(Date.parse(snapshot[0].viewedAt) >= before);
    assert.ok(Date.parse(snapshot[0].viewedAt) <= Date.now());
    assert.strictEqual(readRecentArticles(), snapshot);
    assert.deepEqual(JSON.parse(browser.localStorage.getItem("minikb_recent_articles")!), snapshot);
  });
});

test("invalidates recent snapshots on deletion and cross-tab storage updates", () => {
  withBrowser((browser) => {
    browser.localStorage.setItem(recentArticlesKey, JSON.stringify([viewedArticle]));
    const first = readRecentArticles();
    assert.strictEqual(readRecentArticles(), first);
    const snapshots: ReturnType<typeof readRecentArticles>[] = [];
    const unsubscribe = subscribeToRecentArticles(() => { snapshots.push(readRecentArticles()); });
    try {
      browser.localStorage.removeItem(recentArticlesKey);
      browser.dispatchEvent(new Event("storage"));
      assert.deepEqual(snapshots[0], []);
      assert.strictEqual(readRecentArticles(), snapshots[0]);
      browser.localStorage.setItem(recentArticlesKey, JSON.stringify([{ ...viewedArticle, title: "Changed in another tab" }]));
      browser.dispatchEvent(new Event("storage"));
      assert.equal(snapshots[1][0].title, "Changed in another tab");
      assert.notStrictEqual(snapshots[1], first);
    } finally {
      unsubscribe();
    }
  });
});

for (const failure of ["access", "read", "write"] as const) {
  test(`handles recent storage ${failure} failures without overwriting or notifying`, () => {
    withBrowser((browser) => {
      browser.localStorage.setItem(recentArticlesKey, JSON.stringify([viewedArticle]));
      const snapshot = readRecentArticles();
      const storage = browser.localStorage;
      const descriptor = Object.getOwnPropertyDescriptor(browser, "localStorage")!;
      const getItem = storage.getItem;
      const setItem = storage.setItem;
      const fail = () => { throw new Error("Storage blocked"); };
      let events = 0;
      const unsubscribe = subscribeToRecentArticles(() => { events += 1; });
      if (failure === "access") Object.defineProperty(browser, "localStorage", { configurable: true, get: fail });
      if (failure === "read") storage.getItem = fail;
      if (failure === "write") storage.setItem = fail;
      try {
        assert.strictEqual(readRecentArticles(), readRecentArticles());
        assert.equal(recordRecentArticle({ id: "new", title: "New article" }), false);
        assert.equal(events, 0);
      } finally {
        Object.defineProperty(browser, "localStorage", descriptor);
        storage.getItem = getItem;
        storage.setItem = setItem;
        unsubscribe();
      }
      assert.strictEqual(readRecentArticles(), snapshot);
      assert.deepEqual(JSON.parse(storage.getItem(recentArticlesKey)!), [viewedArticle]);
    });
  });
}

test("notifies recent subscribers after persistence and removes both listeners on cleanup", () => {
  withBrowser((browser) => {
    let events = 0;
    const unsubscribe = subscribeToRecentArticles(() => {
      events += 1;
      assert.equal(readRecentArticles()[0].id, "opened");
      assert.equal(JSON.parse(browser.localStorage.getItem(recentArticlesKey)!)[0].id, "opened");
    });
    recordRecentArticle({ id: "opened", title: "Opened article" });
    assert.equal(events, 1);
    browser.dispatchEvent(new Event("storage"));
    browser.dispatchEvent(new Event("minikb-recent-articles"));
    assert.equal(events, 3);
    unsubscribe();
    browser.dispatchEvent(new Event("storage"));
    browser.dispatchEvent(new Event(recentArticlesEvent));
    assert.equal(events, 3);
  });
});

test("recent history is safe to read, record and subscribe to without a browser", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
  try {
    const snapshot = readRecentArticles();
    assert.deepEqual(snapshot, []);
    assert.strictEqual(readRecentArticles(), snapshot);
    assert.equal(recordRecentArticle({ id: "server", title: "Server article" }), false);
    subscribeToRecentArticles(() => assert.fail("Unexpected server event"))();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
