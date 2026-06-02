import { getRecords } from "@/lib/pocketbase/server";
import type { ArticleFolder, RawPocketBaseRecord } from "@/types/database";

type CategoryRow = RawPocketBaseRecord & {
  category: string | null;
};

export type ArticleFolderOption = {
  id?: string;
  name: string;
  sort_order: number | null;
  articleCount: number;
  managed: boolean;
};

function normalizeFolder(value?: string | null) {
  return (value || "General").trim().replace(/\s+/g, " ") || "General";
}

export async function getArticleFolderOptions(): Promise<ArticleFolderOption[]> {
  let managedFolders: ArticleFolder[] = [];
  let categoryRows: CategoryRow[] = [];

  try {
    const response = await getRecords<ArticleFolder>("article_folders", {
      fields: "id,name,sort_order,created_at,updated_at",
      sort: "sort_order,name",
      perPage: 500,
    });
    managedFolders = response.items;
  } catch {
    managedFolders = [];
  }

  try {
    const response = await getRecords<CategoryRow>("articles", {
      fields: "id,category",
      sort: "category",
      perPage: 500,
    });
    categoryRows = response.items;
  } catch {
    categoryRows = [];
  }

  const counts = new Map<string, number>();
  for (const row of categoryRows) {
    const name = normalizeFolder(row.category);
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  const byName = new Map<string, ArticleFolderOption>();

  byName.set("General", {
    name: "General",
    sort_order: 0,
    articleCount: counts.get("General") || 0,
    managed: false,
  });

  for (const folder of managedFolders) {
    const name = normalizeFolder(folder.name);
    byName.set(name, {
      id: folder.id,
      name,
      sort_order: folder.sort_order,
      articleCount: counts.get(name) || 0,
      managed: true,
    });
  }

  for (const [name, count] of counts) {
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        sort_order: null,
        articleCount: count,
        managed: false,
      });
    }
  }

  return Array.from(byName.values()).sort((a, b) => {
    if (a.name === "General") return -1;
    if (b.name === "General") return 1;

    const aOrder = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}
