export type RecentArticle = {
  id: string;
  title: string;
  viewedAt: string;
};

export const recentArticlesKey = "minikb_recent_articles";
export const recentArticlesEvent = "minikb-recent-articles";

const emptyRecentArticles: RecentArticle[] = [];
let cachedStored: string | null | undefined;
let cachedItems: RecentArticle[] = emptyRecentArticles;

function isRecentArticle(value: unknown): value is RecentArticle {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" && item.id.trim().length > 0 &&
    typeof item.title === "string" && item.title.trim().length > 0 &&
    typeof item.viewedAt === "string" && Number.isFinite(Date.parse(item.viewedAt))
  );
}

function safeParse(value: string | null) {
  if (value === cachedStored) return cachedItems;

  cachedStored = value;
  cachedItems = emptyRecentArticles;
  try {
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(isRecentArticle);
      if (valid.length > 0) cachedItems = valid;
    }
  } catch {
    // Malformed browser-local state is an empty collection until the next visit.
  }
  return cachedItems;
}

export function readRecentArticles() {
  if (typeof window === "undefined") return emptyRecentArticles;
  try {
    return safeParse(window.localStorage.getItem(recentArticlesKey));
  } catch {
    return emptyRecentArticles;
  }
}

export function subscribeToRecentArticles(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const target = window;
  target.addEventListener("storage", onStoreChange);
  target.addEventListener(recentArticlesEvent, onStoreChange);

  return () => {
    target.removeEventListener("storage", onStoreChange);
    target.removeEventListener(recentArticlesEvent, onStoreChange);
  };
}

export function recordRecentArticle(article: Pick<RecentArticle, "id" | "title">) {
  if (typeof window === "undefined") return false;
  try {
    // Keep unreadable history intact rather than replacing it with a new visit.
    const previous = safeParse(window.localStorage.getItem(recentArticlesKey));
    const current = { id: article.id, title: article.title, viewedAt: new Date().toISOString() };
    const next = [current, ...previous.filter((item) => item.id !== article.id)].slice(0, 8);
    const stored = JSON.stringify(next);
    window.localStorage.setItem(recentArticlesKey, stored);
    cachedStored = stored;
    cachedItems = next;
    window.dispatchEvent(new Event(recentArticlesEvent));
    return true;
  } catch {
    return false;
  }
}
