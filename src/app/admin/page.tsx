import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  BookOpenText,
  Building2,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileArchive,
  FolderCog,
  Gauge,
  History,
  Plus,
  Server,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import AdminSettingsForm from "@/components/admin-settings-form";
import AdminUserManagement from "@/components/admin-user-management";
import { getAdminSettings } from "@/lib/admin-settings";
import { getArticleFolderOptions } from "@/lib/article-folders";
import { requireAdmin } from "@/lib/auth";
import { getRecords } from "@/lib/pocketbase/server";
import { POCKETBASE_URL } from "@/lib/pocketbase/config";
import type {
  ActivityLog,
  AppRole,
  Article,
  Asset,
  Attachment,
  Company,
  RawPocketBaseRecord,
  UserProfile,
} from "@/types/database";

type AdminUser = RawPocketBaseRecord & Pick<UserProfile, "username" | "full_name" | "email" | "role">;

type AdminArticle = RawPocketBaseRecord &
  Pick<Article, "title" | "summary" | "category" | "company_id" | "is_draft" | "is_internal">;

type AdminAsset = RawPocketBaseRecord &
  Pick<Asset, "name" | "asset_type" | "company_id" | "description">;
type AdminCompany = RawPocketBaseRecord & Pick<Company, "name" | "website" | "description">;
type AdminAttachment = RawPocketBaseRecord &
  Pick<Attachment, "file_name" | "article_id" | "asset_id" | "file_size">;
type AdminActivityLog = RawPocketBaseRecord &
  Pick<ActivityLog, "action" | "target_collection" | "record_id" | "record_label" | "detail" | "actor">;

async function loadItems<T extends RawPocketBaseRecord>(
  collection: string,
  options: Parameters<typeof getRecords<T>>[1],
) {
  try {
    const { items } = await getRecords<T>(collection, options);
    return items;
  } catch {
    return [];
  }
}

function percent(done: number, total: number) {
  if (total === 0) return 100;
  return Math.round((done / total) * 100);
}

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOlderThan(value: string | null | undefined, days: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function roleCount(users: AdminUser[], role: AppRole) {
  return users.filter((user) => user.role === role).length;
}

export default async function AdminPage() {
  await requireAdmin();

  const [
    users,
    articles,
    assets,
    companies,
    attachments,
    activityLogs,
    settings,
    folders,
  ] = await Promise.all([
    loadItems<AdminUser>("users", {
      fields: "id,username,full_name,email,role,created_at",
      sort: "-created_at",
      perPage: 500,
    }),
    loadItems<AdminArticle>("articles", {
      fields: "id,title,summary,category,company_id,is_draft,is_internal,created_at,updated_at",
      sort: "-updated_at",
      perPage: 500,
    }),
    loadItems<AdminAsset>("assets", {
      fields: "id,name,asset_type,company_id,description,created_at,updated_at",
      sort: "-updated_at",
      perPage: 500,
    }),
    loadItems<AdminCompany>("companies", {
      fields: "id,name,website,description,created_at,updated_at",
      sort: "name",
      perPage: 500,
    }),
    loadItems<AdminAttachment>("attachments", {
      fields: "id,file_name,article_id,asset_id,file_size,created_at",
      sort: "-created_at",
      perPage: 500,
    }),
    loadItems<AdminActivityLog>("activity_logs", {
      fields: "id,action,target_collection,record_id,record_label,detail,actor,created_at",
      sort: "-created_at",
      perPage: 25,
    }),
    getAdminSettings(),
    getArticleFolderOptions(),
  ]);

  const draftArticles = articles.filter((article) => article.is_draft);
  const publishedArticles = articles.filter((article) => !article.is_draft);
  const internalArticles = articles.filter((article) => article.is_internal);
  const publicArticles = articles.filter((article) => !article.is_internal);
  const articlesMissingSummary = articles.filter((article) => !article.summary?.trim());
  const articlesWithoutFolder = articles.filter((article) => !article.category?.trim());
  const staleDrafts = draftArticles.filter((article) =>
    isOlderThan(article.updated_at || article.created_at, 14)
  );

  const articleCompanyIds = new Set(articles.map((article) => article.company_id).filter(Boolean));
  const assetCompanyIds = new Set(assets.map((asset) => asset.company_id).filter(Boolean));
  const companiesWithoutDocs = companies.filter((company) => !articleCompanyIds.has(company.id));
  const companiesWithoutAssets = companies.filter((company) => !assetCompanyIds.has(company.id));
  const assetsWithoutCompany = assets.filter((asset) => !asset.company_id);
  const orphanAttachments = attachments.filter((file) => !file.article_id && !file.asset_id);
  const emptyFolders = folders.filter((folder) => folder.articleCount === 0);

  const healthItems = [
    {
      title: "Articles missing summaries",
      count: articlesMissingSummary.length,
      icon: BookOpenText,
      severity: articlesMissingSummary.length ? "warning" : "ok",
      items: articlesMissingSummary.slice(0, 5).map((article) => ({
        label: article.title,
        detail: "Add a summary for better scanning.",
        href: `/articles/${article.id}/edit`,
      })),
    },
    {
      title: "Stale drafts",
      count: staleDrafts.length,
      icon: Clock3,
      severity: staleDrafts.length ? "warning" : "ok",
      items: staleDrafts.slice(0, 5).map((article) => ({
        label: article.title,
        detail: `Last updated ${formatDate(article.updated_at || article.created_at)}`,
        href: `/articles/${article.id}/edit`,
      })),
    },
    {
      title: "Articles without folders",
      count: articlesWithoutFolder.length,
      icon: FolderCog,
      severity: articlesWithoutFolder.length ? "info" : "ok",
      items: articlesWithoutFolder.slice(0, 5).map((article) => ({
        label: article.title,
        detail: "Assign a KB folder for easier browsing.",
        href: `/articles/${article.id}/edit`,
      })),
    },
    {
      title: "Clients without KB docs",
      count: companiesWithoutDocs.length,
      icon: Building2,
      severity: companiesWithoutDocs.length ? "warning" : "ok",
      items: companiesWithoutDocs.slice(0, 5).map((company) => ({
        label: company.name,
        detail: "No linked articles yet.",
        href: `/companies/${company.id}`,
      })),
    },
    {
      title: "Clients without assets",
      count: companiesWithoutAssets.length,
      icon: Server,
      severity: companiesWithoutAssets.length ? "info" : "ok",
      items: companiesWithoutAssets.slice(0, 5).map((company) => ({
        label: company.name,
        detail: "No linked assets yet.",
        href: `/companies/${company.id}/assets`,
      })),
    },
    {
      title: "Assets without clients",
      count: assetsWithoutCompany.length,
      icon: Server,
      severity: assetsWithoutCompany.length ? "warning" : "ok",
      items: assetsWithoutCompany.slice(0, 5).map((asset) => ({
        label: asset.name,
        detail: asset.asset_type?.replace(/_/g, " ") || "Unassigned asset",
        href: `/assets/${asset.id}`,
      })),
    },
    {
      title: "Empty folders",
      count: emptyFolders.length,
      icon: FolderCog,
      severity: emptyFolders.length ? "info" : "ok",
      items: emptyFolders.slice(0, 5).map((folder) => ({
        label: folder.name,
        detail: folder.managed ? "Managed folder has no articles." : "Detected folder has no articles.",
        href: "/articles/folders",
      })),
    },
    {
      title: "Orphan attachments",
      count: orphanAttachments.length,
      icon: FileArchive,
      severity: orphanAttachments.length ? "warning" : "ok",
      items: orphanAttachments.slice(0, 5).map((file) => ({
        label: file.file_name,
        detail: "Not linked to an article or asset.",
        href: "/admin",
      })),
    },
  ];

  const overviewStats = [
    { label: "Users", value: users.length, detail: `${roleCount(users, "admin")} admins`, icon: Users, href: "#users" },
    { label: "Articles", value: articles.length, detail: `${draftArticles.length} drafts`, icon: BookOpenText, href: "/articles" },
    { label: "Clients", value: companies.length, detail: `${percent(companies.length - companiesWithoutDocs.length, companies.length)}% KB coverage`, icon: Building2, href: "/companies" },
    { label: "Assets", value: assets.length, detail: `${assetsWithoutCompany.length} unassigned`, icon: Server, href: "/assets" },
    { label: "Files", value: attachments.length, detail: `${orphanAttachments.length} orphaned`, icon: FileArchive, href: "/articles" },
    { label: "Folders", value: folders.length, detail: `${emptyFolders.length} empty`, icon: FolderCog, href: "/articles/folders" },
  ];

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="relative border-b border-slate-800 bg-slate-900/35 px-5 py-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/45 to-sky-300/0" />
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Administration
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Workspace Control Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Manage access, monitor KB health, review activity, and keep MiniKB tidy.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AdminAction href="/articles/new" label="New Article" icon={Plus} primary />
              <AdminAction href="/articles/folders" label="Folders" icon={FolderCog} />
              <AdminAction href="/companies/new" label="New Client" icon={Building2} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {overviewStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="interactive-surface rounded border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-semibold text-white">{stat.value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{stat.label}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-panel overflow-hidden rounded-2xl">
          <div className="border-b border-slate-800 bg-slate-900/35 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              Content Health
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Cleanup Queue
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Find gaps that make the KB harder to search, browse, or trust.
            </p>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {healthItems.map((group) => (
              <HealthCard key={group.title} group={group} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="surface-panel overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/35 px-4 py-3">
              <Gauge className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">Publishing Signal</h2>
            </div>
            <div className="space-y-3 p-4">
              <Signal label="Published" value={publishedArticles.length} total={articles.length} />
              <Signal label="Drafts" value={draftArticles.length} total={articles.length} />
              <Signal label="Internal" value={internalArticles.length} total={articles.length} />
              <Signal label="Public" value={publicArticles.length} total={articles.length} />
            </div>
          </section>

          <section className="surface-panel overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/35 px-4 py-3">
              <Wrench className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">Maintenance</h2>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-emerald-100">
                <div className="flex items-center gap-2 font-semibold">
                  <DatabaseZap className="h-4 w-4" />
                  PocketBase reachable
                </div>
                <p className="mt-1 break-all text-xs text-emerald-200/75">{POCKETBASE_URL}</p>
              </div>
              <MaintenanceLink href="/articles/folders" label="Manage KB folders" />
              <MaintenanceLink href="/profile" label="Profile and password settings" />
              <MaintenanceLink href="/articles?status=draft" label="Review draft articles" />
              <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-3 text-xs text-slate-500">
                Local scripts: <span className="text-slate-300">npm.cmd run pb:check</span>,{" "}
                <span className="text-slate-300">npm.cmd run pb:import</span>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <AdminSettingsForm settings={settings} folders={folders.map((folder) => folder.name)} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div id="users">
          <AdminUserManagement users={users} />
        </div>

        <section className="surface-panel overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/35 px-4 py-3">
            <History className="h-4 w-4 text-orange-300" />
            <h2 className="text-sm font-semibold text-white">Activity & Audit</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {activityLogs.length === 0 && (
              <div className="px-4 py-8 text-sm text-slate-400">
                No audit events yet. Role and settings changes will appear here.
              </div>
            )}

            {activityLogs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {log.record_label || log.action}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {log.detail || log.action} - {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function AdminAction({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
        primary
          ? "bg-orange-500 text-white hover:bg-orange-400"
          : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-orange-500/50 hover:text-orange-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function HealthCard({
  group,
}: {
  group: {
    title: string;
    count: number;
    icon: ComponentType<{ className?: string }>;
    severity: string;
    items: Array<{ label: string; detail: string; href: string }>;
  };
}) {
  const Icon = group.icon;
  const ok = group.count === 0;
  const tone = ok
    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
    : group.severity === "info"
      ? "border-sky-500/20 bg-sky-500/5 text-sky-200"
      : "border-orange-500/20 bg-orange-500/5 text-orange-200";

  return (
    <div className="rounded border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-orange-300" />
          <h3 className="text-sm font-semibold text-white">{group.title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${tone}`}>
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {group.count}
        </span>
      </div>
      <div className="space-y-1 p-3">
        {group.items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-500">No action needed.</p>
        ) : (
          group.items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="block rounded px-2 py-2 text-sm transition hover:bg-slate-900"
            >
              <span className="block truncate font-medium text-slate-200">{item.label}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function Signal({ label, value, total }: { label: string; value: number; total: number }) {
  const width = percent(value, total);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-sky-400"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MaintenanceLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-slate-300 transition hover:border-orange-500/40 hover:text-orange-200"
    >
      {label}
      <span className="text-slate-600">Open</span>
    </Link>
  );
}
