import EditArticleForm from "@/components/edit-article-form";
import { getRecord, getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";
import type { Article, Company } from "@/types/database";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;
  let article: Article | null = null;
  let companies: Pick<Company, "id" | "name">[] = [];

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

  if (!article) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Article not found.
      </div>
    );
  }

  const folders = (await getArticleFolderOptions()).map((folder) => folder.name);

  return (
    <EditArticleForm
      article={article}
      companies={companies}
      folders={folders}
    />
  );
}
