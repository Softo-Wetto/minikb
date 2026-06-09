import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  Building2,
  Clock3,
  FileArchive,
  FolderKanban,
  HardDrive,
  LockKeyhole,
  Pin,
  Server,
  ShieldCheck,
} from "lucide-react";
import RecentViews from "@/components/recent-views";

type ArticleSummary = {
  id: string;
  title: string;
  category: string | null;
  summary?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AssetSummary = {
  id: string;
  name: string;
  asset_type?: string | null;
  company_id?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CompanySummary = {
  id: string;
  name: string;
  website?: string | null;
};

type DashboardOverviewProps = {
  articleCount: number;
  assetCount: number;
  companyCount: number;
  attachmentCount: number;
  categoryCount: number;
  pinnedCount: number;
  internalCount: number;
  publicCount: number;
  assignedAssetCount: number;
  recentArticles: ArticleSummary[];
  recentAssets: AssetSummary[];
  pinnedArticles: ArticleSummary[];
  companiesWithoutDocs: CompanySummary[];
  companiesWithoutAssets: CompanySummary[];
  unassignedAssets: AssetSummary[];
  articlesMissingSummary: ArticleSummary[];
  staleArticles: ArticleSummary[];
  assets: AssetSummary[];
};

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

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function assetTypeLabel(value?: string | null) {
  return (value || "asset")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DashboardOverview({
  articleCount,
  assetCount,
  companyCount,
  attachmentCount,
  categoryCount,
  pinnedCount,
  internalCount,
  publicCount,
  assignedAssetCount,
  recentArticles,
  recentAssets,
  pinnedArticles,
  companiesWithoutDocs,
  companiesWithoutAssets,
  unassignedAssets,
  articlesMissingSummary,
  staleArticles,
  assets,
}: DashboardOverviewProps) {
  const docCoverage = percent(companyCount - companiesWithoutDocs.length, companyCount);
  const assetCoverage = percent(companyCount - companiesWithoutAssets.length, companyCount);
  const assetAssignment = percent(assignedAssetCount, assetCount);
  const attentionCount =
    companiesWithoutDocs.length +
    companiesWithoutAssets.length +
    unassignedAssets.length +
    articlesMissingSummary.length +
    staleArticles.length;

  const primaryStats = [
    { label: "Articles", value: articleCount, icon: BookOpenText, href: "/articles" },
    { label: "Companies", value: companyCount, icon: Building2, href: "/companies" },
    { label: "Assets", value: assetCount, icon: Server, href: "/assets" },
    { label: "Files", value: attachmentCount, icon: FileArchive, href: "/articles" },
  ];

  const assetTypeCounts = Array.from(
    assets.reduce((map, asset) => {
      const key = asset.asset_type || "other";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900/45 px-5 py-5 md:flex-row md:items-end">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/45 to-sky-300/0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              MiniKB Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Workspace Health
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Track documentation coverage, client inventory, and stale records
              from the data already in PocketBase.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/companies"
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 text-sm font-medium text-slate-200 transition hover:border-orange-500/60 hover:text-white"
            >
              Review Clients
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/articles/new"
              className="inline-flex h-9 items-center rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              New Article
            </Link>
          </div>
        </div>

        <div className="grid gap-px bg-slate-800 sm:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group bg-slate-950/80 p-5 transition hover:bg-slate-900/75"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <Icon className="h-4 w-4 text-orange-300" />
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">
                  {item.value}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition group-hover:text-orange-300">
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <HealthCard
          label="Client Docs Coverage"
          value={`${docCoverage}%`}
          detail={`${companyCount - companiesWithoutDocs.length} of ${companyCount} clients have articles`}
          icon={ShieldCheck}
          tone={docCoverage >= 80 ? "good" : "warn"}
        />
        <HealthCard
          label="Client Asset Coverage"
          value={`${assetCoverage}%`}
          detail={`${companyCount - companiesWithoutAssets.length} of ${companyCount} clients have assets`}
          icon={HardDrive}
          tone={assetCoverage >= 80 ? "good" : "warn"}
        />
        <HealthCard
          label="Assigned Assets"
          value={`${assetAssignment}%`}
          detail={`${assignedAssetCount} of ${assetCount} assets linked to clients`}
          icon={Building2}
          tone={assetAssignment >= 90 ? "good" : "warn"}
        />
        <HealthCard
          label="Attention Items"
          value={String(attentionCount)}
          detail="Gaps, stale docs, and missing summaries"
          icon={AlertTriangle}
          tone={attentionCount === 0 ? "good" : "warn"}
        />
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <section className="surface-card rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Recently Updated Articles</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest article changes in the workspace.
              </p>
            </div>
            <Clock3 className="h-4 w-4 text-slate-500" />
          </div>

          <div className="divide-y divide-slate-800">
            {recentArticles.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400">
                No articles yet.
              </div>
            )}

            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-900/70"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100 group-hover:text-orange-200">
                    {article.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{article.category || "General"}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <span>{formatDate(article.updated_at)}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <section className="surface-card rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Knowledge Signals</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Visibility and categorization.
                </p>
              </div>
              <FolderKanban className="h-4 w-4 text-orange-300" />
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-800">
              <MiniStat label="Categories" value={categoryCount} icon={FolderKanban} />
              <MiniStat label="Pinned" value={pinnedCount} icon={Pin} />
              <MiniStat label="Internal" value={internalCount} icon={LockKeyhole} />
              <MiniStat label="Public" value={publicCount} icon={BookOpenText} />
            </div>
          </section>

          <section className="surface-card rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Asset Types</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Inventory split by type.
                </p>
              </div>
              <Server className="h-4 w-4 text-orange-300" />
            </div>
            <div className="space-y-3 p-4">
              {assetTypeCounts.length === 0 && (
                <div className="rounded border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
                  No assets yet.
                </div>
              )}
              {assetTypeCounts.map(([type, count]) => (
                <div key={type}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="text-slate-300">{assetTypeLabel(type)}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 rounded bg-slate-900">
                    <div
                      className="h-full rounded bg-orange-500"
                      style={{ width: `${percent(count, assetCount)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AttentionList
          title="Clients Without Articles"
          empty="Every client has at least one article."
          items={companiesWithoutDocs.slice(0, 6).map((company) => ({
            id: company.id,
            label: company.name,
            detail: company.website || "No website",
            href: `/companies/${company.id}`,
          }))}
        />
        <AttentionList
          title="Unassigned Assets"
          empty="Every asset is linked to a client."
          items={unassignedAssets.slice(0, 6).map((asset) => ({
            id: asset.id,
            label: asset.name,
            detail: assetTypeLabel(asset.asset_type),
            href: `/assets/${asset.id}`,
          }))}
        />
        <AttentionList
          title="Docs To Improve"
          empty="No obvious article cleanup needed."
          items={[
            ...articlesMissingSummary.map((article) => ({
              id: `summary-${article.id}`,
              label: article.title,
              detail: "Missing summary",
              href: `/articles/${article.id}/edit`,
            })),
            ...staleArticles.map((article) => ({
              id: `stale-${article.id}`,
              label: article.title,
              detail: `Last updated ${formatDate(article.updated_at || article.created_at)}`,
              href: `/articles/${article.id}/edit`,
            })),
          ].slice(0, 6)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <section className="surface-card rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Recently Updated Assets</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest inventory changes.
              </p>
            </div>
            <HardDrive className="h-4 w-4 text-orange-300" />
          </div>
          <div className="divide-y divide-slate-800">
            {recentAssets.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400">
                No assets yet.
              </div>
            )}
            {recentAssets.map((asset) => (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-900/70"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100 group-hover:text-orange-200">
                    {asset.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {assetTypeLabel(asset.asset_type)} - {formatDate(asset.updated_at)}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
              </Link>
            ))}
          </div>
        </section>

        <section className="surface-card rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Pinned</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fast access to high-value procedures.
              </p>
            </div>
            <Pin className="h-4 w-4 text-orange-300" />
          </div>

          <div className="space-y-2 p-3">
            {pinnedArticles.length === 0 && (
              <div className="rounded border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
                No pinned articles yet.
              </div>
            )}

            {pinnedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="block rounded border border-slate-800 bg-slate-900/40 px-3 py-3 transition hover:border-orange-500/40 hover:bg-orange-500/10"
              >
                <div className="text-sm font-medium text-white">{article.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {article.category || "General"}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-4 xl:col-span-2 2xl:grid-cols-2">
          <RecentViews />
          <QuickLaunch />
        </div>
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ShieldCheck;
  tone: "good" | "warn";
}) {
  return (
    <div className="surface-card interactive-surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className={tone === "good" ? "h-4 w-4 text-emerald-300" : "h-4 w-4 text-orange-300"} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BookOpenText;
}) {
  return (
    <div className="bg-slate-950/95 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function AttentionList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    label: string;
    detail: string;
    href: string;
  }>;
}) {
  return (
    <section className="surface-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <AlertTriangle className="h-4 w-4 text-orange-300" />
      </div>
      <div className="space-y-2 p-3">
        {items.length === 0 && (
          <div className="rounded border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
            {empty}
          </div>
        )}
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block rounded border border-slate-800 bg-slate-900/35 px-3 py-3 transition hover:border-orange-500/40 hover:bg-orange-500/10"
          >
            <div className="truncate text-sm font-medium text-white">
              {item.label}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {item.detail}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function QuickLaunch() {
  const actions = [
    {
      label: "Write a KB article",
      detail: "Create a central or client-specific procedure.",
      href: "/articles/new",
      icon: BookOpenText,
    },
    {
      label: "Add an asset",
      detail: "Track servers, endpoints, services, or URLs.",
      href: "/assets/new",
      icon: Server,
    },
    {
      label: "Add a client",
      detail: "Create a workspace for a company.",
      href: "/companies/new",
      icon: Building2,
    },
    {
      label: "Manage folders",
      detail: "Organize KB categories and folder structure.",
      href: "/articles/folders",
      icon: FolderKanban,
    },
  ];

  return (
    <section className="surface-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Quick Launch</h2>
          <p className="mt-1 text-xs text-slate-500">
            Common actions from the dashboard.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-orange-300" />
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded border border-slate-800 bg-slate-900/35 p-3 transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-slate-950 ring-1 ring-slate-800 transition group-hover:ring-orange-500/40">
                <Icon className="h-4 w-4 text-orange-300" />
              </div>
              <div className="text-sm font-semibold text-white">
                {action.label}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {action.detail}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
