import DashboardOverview from "@/components/dashboard-overview";
import { getRecords } from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import type { Article, Asset, Attachment, Company } from "@/types/database";

export default async function HomePage() {
  await requireUser();

  let safeArticles: Article[] = [];
  let safeAssets: Asset[] = [];
  let safeCompanies: Company[] = [];
  let safeAttachments: Attachment[] = [];

  try {
    const { items } = await getRecords<Article>("articles", {
      fields: "id,title,category,summary,company_id,created_at,updated_at,is_pinned,is_internal",
      sort: "-updated_at",
    });
    safeArticles = items;
  } catch {
    safeArticles = [];
  }

  try {
    const { items } = await getRecords<Asset>("assets", {
      fields: "id,name,asset_type,company_id,description,created_at,updated_at",
      sort: "-updated_at",
    });
    safeAssets = items;
  } catch {
    safeAssets = [];
  }

  try {
    const { items } = await getRecords<Company>("companies", {
      fields: "id,name,website,description,created_at,updated_at",
      sort: "name",
    });
    safeCompanies = items;
  } catch {
    safeCompanies = [];
  }

  try {
    const { items } = await getRecords<Attachment>("attachments", {
      fields: "id,article_id,asset_id,created_at",
      sort: "-created_at",
    });
    safeAttachments = items;
  } catch {
    safeAttachments = [];
  }

  const categoryCount = new Set(
    safeArticles.map((article) => article.category || "General")
  ).size;

  const pinnedArticles = safeArticles.filter((article) => article.is_pinned);
  const internalArticles = safeArticles.filter((article) => article.is_internal);
  const articleCompanyIds = new Set(
    safeArticles.map((article) => article.company_id).filter(Boolean)
  );
  const assetCompanyIds = new Set(
    safeAssets.map((asset) => asset.company_id).filter(Boolean)
  );

  const companiesWithoutDocs = safeCompanies.filter(
    (company) => !articleCompanyIds.has(company.id)
  );
  const companiesWithoutAssets = safeCompanies.filter(
    (company) => !assetCompanyIds.has(company.id)
  );
  const unassignedAssets = safeAssets.filter((asset) => !asset.company_id);
  const articlesMissingSummary = safeArticles.filter(
    (article) => !article.summary?.trim()
  );
  const articleTimes = safeArticles
    .map((article) => new Date(article.updated_at || article.created_at || "").getTime())
    .filter(Number.isFinite);
  const latestArticleTime = articleTimes.length > 0 ? Math.max(...articleTimes) : 0;
  const staleThreshold = latestArticleTime - 1000 * 60 * 60 * 24 * 90;
  const staleArticles = safeArticles.filter((article) => {
    const value = article.updated_at || article.created_at;
    if (!value) return false;
    const time = new Date(value).getTime();
    return staleThreshold > 0 && Number.isFinite(time) && time < staleThreshold;
  });

  return (
    <div className="space-y-4">
      <DashboardOverview
        articleCount={safeArticles.length}
        assetCount={safeAssets.length}
        companyCount={safeCompanies.length}
        attachmentCount={safeAttachments.length}
        categoryCount={categoryCount}
        pinnedCount={pinnedArticles.length}
        internalCount={internalArticles.length}
        publicCount={safeArticles.length - internalArticles.length}
        assignedAssetCount={safeAssets.length - unassignedAssets.length}
        recentArticles={safeArticles.slice(0, 8)}
        recentAssets={safeAssets.slice(0, 6)}
        pinnedArticles={pinnedArticles.slice(0, 6)}
        companiesWithoutDocs={companiesWithoutDocs}
        companiesWithoutAssets={companiesWithoutAssets}
        unassignedAssets={unassignedAssets}
        articlesMissingSummary={articlesMissingSummary}
        staleArticles={staleArticles}
        assets={safeAssets}
      />
    </div>
  );
}
