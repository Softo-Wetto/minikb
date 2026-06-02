import NewArticleForm from "@/components/new-article-form";
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

  const folders = (await getArticleFolderOptions()).map((folder) => folder.name);

  return (
    <NewArticleForm
      companies={companies}
      folders={folders}
      initialCompanyId={companyId}
    />
  );
}
