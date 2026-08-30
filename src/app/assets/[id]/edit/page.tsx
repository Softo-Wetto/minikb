import AssetForm from "@/components/asset-form";
import { settleConcurrent } from "@/lib/concurrent-loaders";
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
  const [assetResult, companiesResult] = await settleConcurrent([
    () => getRecord<Asset>("assets", id),
    () => getRecords<Company>("companies", {
      fields: "id,name",
      sort: "name",
    }),
  ]);

  const asset = assetResult.status === "fulfilled" ? assetResult.value : null;
  const companies = companiesResult.status === "fulfilled"
    ? companiesResult.value.items.map((company) => ({
      id: company.id,
      name: company.name,
    }))
    : [];

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
