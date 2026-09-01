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
let cachedStored = "";
let cachedFavorites: FavoriteArticle[] = emptyFavorites;

function safeParse(value: string | null) {
  if (!value) return emptyFavorites;
  if (value === cachedStored) return cachedFavorites;

  try {
    cachedStored = value;
    cachedFavorites = JSON.parse(value) as FavoriteArticle[];
    return cachedFavorites;
  } catch {
    cachedStored = value;
    cachedFavorites = emptyFavorites;
    return emptyFavorites;
  }
}

export function readFavoriteArticles() {
  if (typeof window === "undefined") return emptyFavorites;
  return safeParse(window.localStorage.getItem(favoriteArticlesKey));
}

export function subscribeToFavoriteArticles(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(favoriteArticlesEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(favoriteArticlesEvent, onStoreChange);
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
  cachedStored = stored;
  cachedFavorites = items;
  window.localStorage.setItem(favoriteArticlesKey, stored);
  window.dispatchEvent(new Event(favoriteArticlesEvent));
}

export function removeFavoriteArticle(articleId: string) {
  if (typeof window === "undefined") return false;

  const current = readFavoriteArticles();
  const next = current.filter((item) => item.id !== articleId);
  if (next.length === current.length) return false;

  storeFavoriteArticles(next);
  return true;
}

export function toggleFavoriteArticle(article: Omit<FavoriteArticle, "favoritedAt">) {
  if (typeof window === "undefined") return false;

  const current = readFavoriteArticles();
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
}
