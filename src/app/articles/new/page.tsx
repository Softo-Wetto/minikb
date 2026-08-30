import NewArticleForm from "@/components/new-article-form";
import { runConcurrent } from "@/lib/concurrent-loaders";
import { getAdminSettings, getSettingValue } from "@/lib/admin-settings";
import { getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";
import type { ArticleTemplate, RawPocketBaseRecord } from "@/types/database";

type ArticleLinkRow = RawPocketBaseRecord & {
  title: string;
};

type CompanyRow = RawPocketBaseRecord & {
  name: string;
};

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; template?: string }>;
}) {
  await requireEditor();
  const { companyId = "", template: initialTemplateId = "" } = await searchParams;

  const [companyRows, templates, articleOptions, folderOptions, settings] =
    await runConcurrent([
      () => getRecords<CompanyRow>("companies", {
        fields: "id,name",
        sort: "name",
      }).then((response) => response.items).catch(() => []),
      () => getRecords<ArticleTemplate>("article_templates", {
        sort: "name",
        perPage: 200,
      }).then((response) => response.items).catch(() => []),
      () => getRecords<ArticleLinkRow>("articles", {
        fields: "id,title",
        sort: "title",
        perPage: 500,
      }).then((response) => response.items).catch(() => []),
      () => getArticleFolderOptions(),
      () => getAdminSettings(),
    ]);
  const companies = companyRows.map((company) => ({
    id: company.id,
    name: company.name,
  }));
  const folders = folderOptions.map((folder) => folder.name);
  const initialCategory = getSettingValue<string>(
    settings,
    "default_article_folder",
    "General"
  );
  const visibility = getSettingValue<string>(
    settings,
    "default_article_visibility",
    "internal"
  );
  const allowPublicArticles = getSettingValue<boolean>(
    settings,
    "allow_public_articles",
    true
  );
  const primaryDraft =
    getSettingValue<string>(settings, "default_new_article_status", "published") ===
    "draft";

  return (
    <NewArticleForm
      companies={companies}
      folders={folders}
      initialCompanyId={companyId}
      initialCategory={initialCategory}
      initialInternal={visibility !== "public"}
      primaryDraft={primaryDraft}
      allowPublicArticles={allowPublicArticles}
      templates={templates}
      initialTemplateId={initialTemplateId}
      articleOptions={articleOptions}
    />
  );
}
