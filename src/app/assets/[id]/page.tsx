import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  HardDrive,
  LinkIcon,
  MapPin,
  Network,
  Paperclip,
  Pencil,
  Server,
} from "lucide-react";
import AttachmentUpload from "@/components/attachment-upload";
import {
  equalsFilter,
  getRecord,
  getRecords,
} from "@/lib/pocketbase/server";
import { getPocketBaseFileUrl } from "@/lib/pocketbase/config";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import type { Asset, Attachment, Company, Json } from "@/types/database";

function metadataObject(metadata?: Json): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function valueOf(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assetTypeLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();

  const { id } = await params;
  let asset: Asset | null = null;

  try {
    asset = await getRecord<Asset>("assets", id);
  } catch {
    asset = null;
  }

  if (!asset) {
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-8 text-slate-300">
        Asset not found.
      </div>
    );
  }

  let company: Company | null = null;
  let attachments: Attachment[] = [];
  const metadata = metadataObject(asset.metadata);

  if (asset.company_id) {
    try {
      company = await getRecord<Company>("companies", asset.company_id);
    } catch {
      company = null;
    }
  }

  try {
    const response = await getRecords<Attachment>("attachments", {
      filter: equalsFilter("asset_id", asset.id),
      sort: "-created_at",
    });
    attachments = response.items;
  } catch (error) {
    console.error("Unable to load asset attachments", error);
  }

  const details = [
    { label: "Hostname", value: valueOf(metadata, "hostname"), icon: Server },
    { label: "IP Address", value: valueOf(metadata, "ip_address"), icon: Network },
    { label: "URL", value: valueOf(metadata, "url"), icon: LinkIcon },
    { label: "Serial Number", value: valueOf(metadata, "serial_number"), icon: HardDrive },
    { label: "Location", value: valueOf(metadata, "location"), icon: MapPin },
  ].filter((item) => item.value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={company ? `/companies/${company.id}#assets` : "/assets"}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {company ? company.name : "Assets"}
        </Link>

        {canEdit(profile.role) && (
          <Link
            href={`/assets/${asset.id}/edit`}
            className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded border border-slate-800 bg-slate-950/85">
          <div className="border-b border-slate-800 px-6 py-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-slate-900 px-2 py-1">
                {assetTypeLabel(asset.asset_type || "asset")}
              </span>
              {company && (
                <Link
                  href={`/companies/${company.id}`}
                  className="inline-flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-orange-300 transition hover:text-orange-200"
                >
                  <Building2 className="h-3 w-3" />
                  {company.name}
                </Link>
              )}
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {asset.name}
            </h1>

            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
              {asset.description || "No description has been added for this asset yet."}
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            {details.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 p-6 text-sm text-slate-500 md:col-span-2">
                No asset details yet. Add hostname, IP, URL, serial number, or location from Edit.
              </div>
            ) : (
              details.map((item) => {
                const Icon = item.icon;
                const isUrl = item.label === "URL" && item.value?.startsWith("http");

                return (
                  <div key={item.label} className="rounded border border-slate-800 bg-slate-900/35 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Icon className="h-4 w-4 text-orange-300" />
                      {item.label}
                    </div>
                    {isUrl ? (
                      <a
                        href={item.value ?? ""}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm font-medium text-orange-200 hover:text-orange-100"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="break-all text-sm font-medium text-slate-100">
                        {item.value}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded border border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <FileText className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">Asset Details</h2>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Created</span>
                <span className="text-right text-slate-200">
                  {formatDate(asset.created_at)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Updated</span>
                <span className="text-right text-slate-200">
                  {formatDate(asset.updated_at)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Company</span>
                <span className="text-right text-slate-200">
                  {company?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Type
                </span>
                <span className="text-right text-slate-200">
                  {assetTypeLabel(asset.asset_type || "asset")}
                </span>
              </div>
            </div>
          </section>

          {valueOf(metadata, "notes") && (
            <section className="rounded border border-slate-800 bg-slate-950/80">
              <div className="border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">Notes</h2>
              </div>
              <p className="whitespace-pre-wrap p-4 text-sm leading-6 text-slate-300">
                {valueOf(metadata, "notes")}
              </p>
            </section>
          )}

          <section className="rounded border border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Paperclip className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">
                Files ({attachments.length})
              </h2>
            </div>
            <div className="space-y-3 p-4">
              {canEdit(profile.role) && <AttachmentUpload assetId={asset.id} />}

              {attachments.length === 0 && (
                <div className="rounded border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                  No files attached.
                </div>
              )}

              {attachments.map((file) => {
                const fileUrl = getPocketBaseFileUrl(
                  "attachments",
                  file.id,
                  file.file || file.file_path
                );

                return (
                  <div key={file.id} className="rounded border border-slate-800 bg-slate-900/40 px-3 py-2">
                    {fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-orange-200 hover:text-orange-100"
                      >
                        {file.file_name}
                      </a>
                    ) : (
                      <div className="text-sm font-medium text-slate-100">
                        {file.file_name}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      {file.mime_type || "File"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
