"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HardDrive, Save } from "lucide-react";
import {
  createRecord,
  getCurrentAuth,
  updateRecord,
} from "@/lib/pocketbase/client";
import type { Asset, AssetType, Company, Json } from "@/types/database";

type CompanyOption = Pick<Company, "id" | "name">;

type AssetFormProps = {
  asset?: Asset;
  companies: CompanyOption[];
  initialCompanyId?: string;
};

const assetTypes: Array<{ value: AssetType; label: string }> = [
  { value: "domain", label: "Domain" },
  { value: "server", label: "Server" },
  { value: "firewall", label: "Firewall" },
  { value: "m365_tenant", label: "Microsoft 365 Tenant" },
  { value: "wifi", label: "WiFi" },
  { value: "printer", label: "Printer" },
  { value: "workstation", label: "Workstation" },
  { value: "other", label: "Other" },
];

function metadataObject(metadata?: Json): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function compactMetadata(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0)
  );
}

export default function AssetForm({
  asset,
  companies,
  initialCompanyId = "",
}: AssetFormProps) {
  const isEditing = Boolean(asset);
  const metadata = useMemo(() => metadataObject(asset?.metadata), [asset?.metadata]);
  const [name, setName] = useState(asset?.name || "");
  const [assetType, setAssetType] = useState<AssetType>(asset?.asset_type || "server");
  const [companyId, setCompanyId] = useState(asset?.company_id || initialCompanyId);
  const [description, setDescription] = useState(asset?.description || "");
  const [hostname, setHostname] = useState(metadataString(metadata, "hostname"));
  const [ipAddress, setIpAddress] = useState(metadataString(metadata, "ip_address"));
  const [primaryUrl, setPrimaryUrl] = useState(metadataString(metadata, "url"));
  const [serialNumber, setSerialNumber] = useState(metadataString(metadata, "serial_number"));
  const [location, setLocation] = useState(metadataString(metadata, "location"));
  const [notes, setNotes] = useState(metadataString(metadata, "notes"));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const auth = getCurrentAuth();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      name,
      asset_type: assetType,
      description: description || "",
      company_id: companyId || null,
      metadata: compactMetadata({
        hostname,
        ip_address: ipAddress,
        url: primaryUrl,
        serial_number: serialNumber,
        location,
        notes,
      }),
      updated_at: now,
    };

    if (!isEditing) {
      payload.created_at = now;
      if (auth?.user.id) payload.created_by = auth.user.id;
    }

    try {
      const saved = isEditing && asset
        ? await updateRecord<Asset>("assets", asset.id, payload)
        : await createRecord<Asset>("assets", payload);
      window.location.href = `/assets/${saved.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save asset.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded border border-slate-800 bg-slate-950/85">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                Assets
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                {isEditing ? "Edit Asset" : "New Asset"}
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Asset name
            </label>
            <input
              className="h-11 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Type
              </label>
              <select
                className="h-11 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
              >
                {assetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Company
              </label>
              <select
                className="h-11 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded border border-slate-800 bg-slate-950/85">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Lifecycle</h2>
          </div>
          <div className="space-y-3 p-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Asset"}
            </button>
            <Link
              href={asset ? `/assets/${asset.id}` : "/assets"}
              className="block rounded border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </section>

        <section className="rounded border border-slate-800 bg-slate-950/85">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Useful Details</h2>
          </div>
          <div className="space-y-4 p-4">
            <Field label="Hostname" value={hostname} onChange={setHostname} />
            <Field label="IP address" value={ipAddress} onChange={setIpAddress} />
            <Field label="URL" value={primaryUrl} onChange={setPrimaryUrl} />
            <Field label="Serial number" value={serialNumber} onChange={setSerialNumber} />
            <Field label="Location" value={location} onChange={setLocation} />
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
              />
            </div>
          </div>
        </section>
      </aside>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
      />
    </div>
  );
}
