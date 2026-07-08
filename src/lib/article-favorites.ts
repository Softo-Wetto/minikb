export type FavoriteArticle = {
  id: string;
  title: string;
  category?: string | null;
  favoritedAt: string;
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
      ].slice(0, 12);

  const stored = JSON.stringify(next);
  cachedStored = stored;
  cachedFavorites = next;
  window.localStorage.setItem(favoriteArticlesKey, stored);
  window.dispatchEvent(new Event(favoriteArticlesEvent));
  return !exists;
}