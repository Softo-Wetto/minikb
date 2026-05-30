import NewArticleForm from "@/components/new-article-form";
import { getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import type { RawPocketBaseRecord } from "@/types/database";

type CompanyRow = RawPocketBaseRecord & {
  name: string;
};

type CategoryRow = RawPocketBaseRecord & {
  category: string | null;
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

  let categoryRows: CategoryRow[] = [];

  try {
    const response = await getRecords<CategoryRow>("articles", {
      fields: "id,category",
      sort: "category",
    });
    categoryRows = response.items;
  } catch {
    categoryRows = [];
  }

  const folders = Array.from(
    new Set(categoryRows.map((row) => row.category).filter(Boolean))
  ) as string[];

  return (
    <NewArticleForm
      companies={companies}
      folders={folders}
      initialCompanyId={companyId}
    />
  );
}
