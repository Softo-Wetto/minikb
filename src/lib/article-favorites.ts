export type FavoriteArticle = {
  id: string;
  title: string;
  category?: string | null;
  favoritedAt: string;
};

export type FavoriteArticleSelection = {
  category?: string;
  limit?: number;
  query?: string;
  sort?: "newest" | "oldest" | "title";
};

export const favoriteArticlesEvent = "minikb-favorite-articles";
export const favoriteArticlesKey = "minikb_favorite_articles";

const emptyFavorites: FavoriteArticle[] = [];
let cachedStored: string | null | undefined;
let cachedFavorites: FavoriteArticle[] = emptyFavorites;

function isFavoriteRecord(value: unknown): value is FavoriteArticle {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" && item.id.trim().length > 0 &&
    typeof item.title === "string" && item.title.trim().length > 0 &&
    (item.category == null || typeof item.category === "string") &&
    typeof item.favoritedAt === "string" && Number.isFinite(Date.parse(item.favoritedAt))
  );
}

function safeParse(value: string | null) {
  if (value === cachedStored) return cachedFavorites;

  cachedStored = value;
  cachedFavorites = emptyFavorites;
  try {
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(isFavoriteRecord);
      if (valid.length > 0) cachedFavorites = valid;
    }
  } catch {
    // Malformed browser-local state is an empty collection until the next save.
  }
  return cachedFavorites;
}

export function readFavoriteArticles() {
  if (typeof window === "undefined") return emptyFavorites;
  try {
    return safeParse(window.localStorage.getItem(favoriteArticlesKey));
  } catch {
    return emptyFavorites;
  }
}

export function subscribeToFavoriteArticles(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const target = window;
  target.addEventListener("storage", onStoreChange);
  target.addEventListener(favoriteArticlesEvent, onStoreChange);

  return () => {
    target.removeEventListener("storage", onStoreChange);
    target.removeEventListener(favoriteArticlesEvent, onStoreChange);
  };
}

export function isFavoriteArticle(articleId: string) {
  return readFavoriteArticles().some((item) => item.id === articleId);
}

export function selectFavoriteArticles(
  items: FavoriteArticle[],
  options: FavoriteArticleSelection = {},
) {
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const category = options.category?.trim() ?? "";
  const selected = items.filter((item) => {
    const matchesCategory = !category || (item.category || "General") === category;
    const matchesQuery =
      !query ||
      item.title.toLocaleLowerCase().includes(query) ||
      (item.category || "General").toLocaleLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  selected.sort((left, right) => {
    if (options.sort === "title") return left.title.localeCompare(right.title);

    const direction = options.sort === "oldest" ? 1 : -1;
    return left.favoritedAt.localeCompare(right.favoritedAt) * direction;
  });

  return typeof options.limit === "number"
    ? selected.slice(0, Math.max(0, options.limit))
    : selected;
}

function storeFavoriteArticles(items: FavoriteArticle[]) {
  const stored = JSON.stringify(items);
  window.localStorage.setItem(favoriteArticlesKey, stored);
  cachedStored = stored;
  cachedFavorites = items.length > 0 ? items : emptyFavorites;
  window.dispatchEvent(new Event(favoriteArticlesEvent));
}

export function removeFavoriteArticle(articleId: string) {
  if (typeof window === "undefined") return false;

  try {
    const current = safeParse(window.localStorage.getItem(favoriteArticlesKey));
    const next = current.filter((item) => item.id !== articleId);
    if (next.length === current.length) return false;

    storeFavoriteArticles(next);
    return true;
  } catch {
    return false;
  }
}

export function toggleFavoriteArticle(article: Omit<FavoriteArticle, "favoritedAt">) {
  if (typeof window === "undefined") return false;

  try {
    // Do not overwrite existing favorites if storage cannot be read.
    const current = safeParse(window.localStorage.getItem(favoriteArticlesKey));
    const exists = current.some((item) => item.id === article.id);
    const next = exists
      ? current.filter((item) => item.id !== article.id)
      : [
          {
            ...article,
            favoritedAt: new Date().toISOString(),
          },
          ...current.filter((item) => item.id !== article.id),
        ];

    storeFavoriteArticles(next);
    return !exists;
  } catch {
    return false;
  }
}
