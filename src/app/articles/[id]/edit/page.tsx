import EditArticleForm from "@/components/edit-article-form";
import { equalsFilter, getRecord, getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";
import type { Article, ArticleRevision, ArticleTemplate, Company } from "@/types/database";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;
  let article: Article | null = null;
  let companies: Pick<Company, "id" | "name">[] = [];
  let revisions: ArticleRevision[] = [];
  let templates: ArticleTemplate[] = [];

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

  if (article) {
    try {
      const response = await getRecords<ArticleRevision>("article_revisions", {
        filter: equalsFilter("article_id", id),
        sort: "-revision_number",
        perPage: 30,
      });
      revisions = response.items;
    } catch {
      revisions = [];
    }
  }

  try {
    const response = await getRecords<ArticleTemplate>("article_templates", {
      sort: "name",
      perPage: 200,
    });
    templates = response.items;
  } catch {
    templates = [];
  }

  const folders = (await getArticleFolderOptions()).map((folder) => folder.name);

  return (
    <EditArticleForm
      article={article}
      companies={companies}
      folders={folders}
      revisions={revisions}
      templates={templates}
    />
  );
}
