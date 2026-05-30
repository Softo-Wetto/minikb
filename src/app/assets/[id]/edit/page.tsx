import AssetForm from "@/components/asset-form";
import { getRecord, getRecords } from "@/lib/pocketbase/server";
import { requireEditor } from "@/lib/auth";
import type { Asset, Company } from "@/types/database";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEditor();

  const { id } = await params;
  let asset: Asset | null = null;
  let companies: Pick<Company, "id" | "name">[] = [];

  try {
    asset = await getRecord<Asset>("assets", id);
  } catch {
    asset = null;
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

  if (!asset) {
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-8 text-slate-300">
        Asset not found.
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <AssetForm asset={asset} companies={companies} />
    </div>
  );
}
