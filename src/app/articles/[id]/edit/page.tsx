import EditArticleForm from "@/components/edit-article-form";
import { getRecord, getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import type { Article, Company, RawPocketBaseRecord } from "@/types/database";

type CategoryRow = RawPocketBaseRecord & {
  category: string | null;
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;
  let article: Article | null = null;
  let companies: Pick<Company, "id" | "name">[] = [];
  let categoryRows: CategoryRow[] = [];

  try {
    article = await getRecord<Article>("articles", id);
  } catch {
    article = null;
  }

  try {
    const response = await getRecords<Company>("companies", {
      fields: "id,name",
      sort: "name",
    });
    companies = response.items.map((company) => ({
      id: company.id,
      name: company.name,
    }));
  } catch {
    companies = [];
  }

  try {
    const response = await getRecords<CategoryRow>("articles", {
      fields: "id,category",
      sort: "category",
    });
    categoryRows = response.items;
  } catch {
    categoryRows = [];
  }

  if (!article) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Article not found.
      </div>
    );
  }

  const folders = Array.from(
    new Set(categoryRows.map((row) => row.category).filter(Boolean))
  ) as string[];

  return (
    <EditArticleForm
      article={article}
      companies={companies}
      folders={folders}
    />
  );
}
