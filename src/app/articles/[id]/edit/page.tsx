import EditArticleForm from "@/components/edit-article-form";
import { settleConcurrent } from "@/lib/concurrent-loaders";
import { equalsFilter, getRecord, getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";
import type { Article, ArticleRevision, ArticleTemplate, Company, RawPocketBaseRecord } from "@/types/database";

type ArticleLinkRow = RawPocketBaseRecord & {
  title: string;
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;
  const [articleResult, companiesResult, revisionsResult, templatesResult, articleOptionsResult, folderOptionsResult] = await settleConcurrent([
    () => getRecord<Article>("articles", id),
    () => getRecords<Company>("companies", {
      fields: "id,name",
      sort: "name",
    }),
    () => getRecords<ArticleRevision>("article_revisions", {
      filter: equalsFilter("article_id", id),
      sort: "-revision_number",
      perPage: 30,
    }),
    () => getRecords<ArticleTemplate>("article_templates", {
      sort: "name",
      perPage: 200,
    }),
    () => getRecords<ArticleLinkRow>("articles", {
      fields: "id,title",
      sort: "title",
      perPage: 500,
    }),
    () => getArticleFolderOptions(),
  ]);

  const article = articleResult.status === "fulfilled" ? articleResult.value : null;
  const companies = companiesResult.status === "fulfilled"
    ? companiesResult.value.items.map((company) => ({
      id: company.id,
      name: company.name,
    }))
    : [];
  const revisions = revisionsResult.status === "fulfilled" ? revisionsResult.value.items : [];
  const templates = templatesResult.status === "fulfilled" ? templatesResult.value.items : [];
  const articleOptions = articleOptionsResult.status === "fulfilled"
    ? articleOptionsResult.value.items.filter((item) => item.id !== id)
    : [];
  if (!article) {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
        Article not found.
      </div>
    );
  }

  if (folderOptionsResult.status === "rejected") {
    throw folderOptionsResult.reason;
  }

  const folders = folderOptionsResult.value.map((folder) => folder.name);

  return (
    <EditArticleForm
      article={article}
      companies={companies}
      folders={folders}
      revisions={revisions}
      templates={templates}
      articleOptions={articleOptions}
    />
  );
}
