import Link from "next/link";
import {
  Building2,
  CalendarClock,
  Filter,
  ExternalLink,
  HardDrive,
  Plus,
  Search,
  Server,
} from "lucide-react";
import { getRecords } from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import type { Asset, Company } from "@/types/database";

function labelForType(value?: string | null) {
  return (value || "asset")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; companyId?: string }>;
}) {
  await requireUser();
  const { q = "", type = "", companyId = "" } = await searchParams;

  let assets: Asset[] = [];
  let companies: Pick<Company, "id" | "name">[] = [];
  let error: Error | null = null;

  try {
    const response = await getRecords<Asset>("assets", {
      sort: "-updated_at",
    });
    assets = response.items;
  } catch (caught) {
    error = caught as Error;
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

  const companyById = new Map(companies.map((company) => [company.id, company.name]));
  const types = Array.from(new Set(assets.map((asset) => asset.asset_type).filter(Boolean)));
  const query = q.trim().toLowerCase();
  const filteredAssets = assets.filter((asset) => {
    const companyName = asset.company_id ? companyById.get(asset.company_id) || "" : "";
    const matchesQuery = !query
      || asset.name.toLowerCase().includes(query)
      || (asset.description || "").toLowerCase().includes(query)
      || companyName.toLowerCase().includes(query);
    const matchesType = !type || asset.asset_type === type;
    const matchesCompany = !companyId
      || (companyId === "unassigned" ? !asset.company_id : asset.company_id === companyId);

    return matchesQuery && matchesType && matchesCompany;
  });
  const assignedCount = assets.filter((asset) => asset.company_id).length;
  const unassignedCount = assets.length - assignedCount;
  const hasFilters = Boolean(query || type || companyId);

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/35 px-5 py-5 sm:flex-row sm:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/40 to-sky-300/0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              Inventory
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Assets
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Track domains, servers, tenants, network devices, and workstations.
            </p>
          </div>

          <Link
            href="/assets/new"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/25 transition hover:from-orange-400 hover:to-amber-400"
          >
            <Plus className="h-4 w-4" />
            New Asset
          </Link>
        </div>

        <div className="grid gap-px border-b border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Assets
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{assets.length}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Linked Clients
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{assignedCount}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unassigned
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{unassignedCount}</p>
          </div>
          <div className="bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Asset Types
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{types.length}</p>
          </div>
        </div>

        <form className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_220px_260px_auto]">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-white focus-within:border-orange-500/70">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search assets, descriptions, companies..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </label>

          <select
            name="type"
            defaultValue={type}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
          >
            <option value="">All Types</option>
            {types.map((assetType) => (
              <option key={assetType} value={assetType}>
                {labelForType(assetType)}
              </option>
            ))}
          </select>

          <select
            name="companyId"
            defaultValue={companyId}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
          >
            <option value="">All Companies</option>
            <option value="unassigned">Unassigned assets</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-orange-500/60 hover:text-orange-200"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/45 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>
              Showing {filteredAssets.length} of {assets.length}
            </span>
            {type && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                {labelForType(type)}
              </span>
            )}
            {companyId && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                {companyId === "unassigned"
                  ? "Unassigned"
                  : companyById.get(companyId) || "Selected company"}
              </span>
            )}
            {query && (
              <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                Search: {q}
              </span>
            )}
          </div>
          {hasFilters && (
            <Link
              href="/assets"
              className="text-xs font-semibold text-orange-300 transition hover:text-orange-200"
            >
              Clear filters
            </Link>
          )}
        </div>

        {error && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error.message}
          </div>
        )}

        {filteredAssets.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-400">
            No assets found.
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredAssets.map((asset) => (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="interactive-surface group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/35 p-4 transition hover:border-orange-500/40 hover:bg-slate-900/70"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/30 to-sky-300/0 opacity-0 transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 text-orange-300 ring-1 ring-orange-500/20 transition group-hover:ring-orange-400/45">
                      <Server className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-white">
                        {asset.name}
                      </h2>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {labelForType(asset.asset_type)}
                      </p>
                    </div>
                  </div>
                  <HardDrive className="h-4 w-4 text-slate-600 transition group-hover:text-orange-300" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/55 px-2.5 py-1 text-slate-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">
                      {asset.company_id
                        ? companyById.get(asset.company_id) || "Linked company"
                        : "Unassigned"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/55 px-2.5 py-1 text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                    {formatDate(asset.updated_at || asset.created_at)}
                  </span>
                </div>

                <p className="mt-4 min-h-[3rem] line-clamp-2 text-sm leading-6 text-slate-400">
                  {asset.description || "No description yet."}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-orange-300 transition group-hover:translate-x-0.5">
                  View asset
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
