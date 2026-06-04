import NewArticleForm from "@/components/new-article-form";
import { getAdminSettings, getSettingValue } from "@/lib/admin-settings";
import { getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";
import type { RawPocketBaseRecord } from "@/types/database";

type CompanyRow = RawPocketBaseRecord & {
  name: string;
};

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requireEditor();
  const { companyId = "" } = await searchParams;

  let companyRows: CompanyRow[] = [];

  try {
    const response = await getRecords<CompanyRow>("companies", {
      fields: "id,name",
      sort: "name",
    });
    companyRows = response.items;
  } catch {
    companyRows = [];
  }

  const companies = companyRows.map((company) => ({
    id: company.id,
    name: company.name,
  }));

  const [folderOptions, settings] = await Promise.all([
    getArticleFolderOptions(),
    getAdminSettings(),
  ]);
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
    />
  );
}
