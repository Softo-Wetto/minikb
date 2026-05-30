import AssetForm from "@/components/asset-form";
import { getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import type { Company } from "@/types/database";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requireEditor();

  const { companyId = "" } = await searchParams;
  let companies: Pick<Company, "id" | "name">[] = [];

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

  return (
    <div className="max-w-6xl">
      <AssetForm companies={companies} initialCompanyId={companyId} />
    </div>
  );
}
