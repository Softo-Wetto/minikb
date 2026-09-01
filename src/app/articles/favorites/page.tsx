import FavoriteArticlesPage from "@/components/favorite-articles-page";
import { requireUser } from "@/lib/auth";

export default async function FavoritesPage() {
  await requireUser();

  return <FavoriteArticlesPage />;
}
