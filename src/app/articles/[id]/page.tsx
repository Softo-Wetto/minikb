import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  FileText,
  LockKeyhole,
  Paperclip,
  Pencil,
  Pin,
} from "lucide-react";
import AttachmentManager from "@/components/attachment-manager";
import ArticleUtilities from "@/components/article-utilities";
import DeleteArticleButton from "@/components/delete-article-button";
import {
  equalsFilter,
  getRecord,
  getRecords,
  notEqualsFilter,
} from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/roles";
import type { Article, Attachment } from "@/types/database";

type RelatedArticle = Pick<Article, "id" | "title"> & {
  created_at: string;
  updated_at: string;
};

function estimateReadTime(text?: string | null) {
  if (!text) return "0 min read";
  const stripped = text.replace(/<[^>]+>/g, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
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

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();

  const { id } = await params;
  let article: Article | null = null;

  try {
    article = await getRecord<Article>("articles", id);
  } catch {
    article = null;
  }

  if (!article) {
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-8 text-slate-300">
        Article not found.
      </div>
    );
  }

  let attachments: Attachment[] = [];
  let relatedArticles: RelatedArticle[] = [];

  try {
    const response = await getRecords<Attachment>("attachments", {
      filter: equalsFilter("article_id", article.id),
      sort: "-created_at",
    });
    attachments = response.items;
  } catch (error) {
    console.error("Unable to load article attachments", error);
  }

  try {
    const response = await getRecords<RelatedArticle>("articles", {
      fields: "id,title",
      filter: [
        equalsFilter("category", article.category || "General"),
        notEqualsFilter("id", article.id),
      ].join(" && "),
      perPage: 5,
    });
    relatedArticles = response.items;
  } catch (error) {
    console.error("Unable to load related articles", error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/articles"
          className="group inline-flex h-9 items-center gap-2 rounded border border-slate-800 bg-slate-950/70 px-3 text-sm font-medium text-slate-300 shadow-sm transition hover:border-orange-500/45 hover:bg-slate-900 hover:text-orange-200"
        >
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
          Back to articles
        </Link>

        <div className="flex flex-wrap gap-2">
          <DeleteArticleButton
            articleId={article.id}
            articleTitle={article.title}
            companyId={article.company_id}
          />
          <Link
            href={`/articles/${article.id}/edit`}
            className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded border border-slate-800 bg-slate-950/85">
          <div className="border-b border-slate-800 px-6 py-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-slate-900 px-2 py-1">
                {article.category || "General"}
              </span>
              {article.is_draft ? (
                <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200">
                  <FileText className="h-3 w-3" />
                  Draft
                </span>
              ) : (
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  Live
                </span>
              )}
              {article.is_internal && (
                <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  <LockKeyhole className="h-3 w-3" />
                  Internal
                </span>
              )}
              {article.is_pinned && (
                <span className="inline-flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-orange-300">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>

            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {article.title}
            </h1>

            {article.summary && (
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
                {article.summary}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {estimateReadTime(article.content)}
              </span>
              <span>Updated {formatDate(article.updated_at || article.created_at)}</span>
            </div>
          </div>

          <div className="px-6 py-8">
            <div
              className="article-content max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content || "" }}
            />
          </div>
        </article>

        <aside className="space-y-4">
          <ArticleUtilities articleId={article.id} title={article.title} />

          <section className="rounded border border-red-500/20 bg-red-500/5 p-4">
            <h2 className="text-sm font-semibold text-red-100">Danger Zone</h2>
            <p className="mt-2 text-sm leading-6 text-red-200/75">
              Permanently delete this KB article and its attached files.
            </p>
            <DeleteArticleButton
              articleId={article.id}
              articleTitle={article.title}
              companyId={article.company_id}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/15 disabled:opacity-50"
            />
          </section>

          <section className="rounded border border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <FileText className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">Article Details</h2>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Created</span>
                <span className="text-right text-slate-200">{formatDate(article.created_at)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Updated</span>
                <span className="text-right text-slate-200">{formatDate(article.updated_at)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Visibility</span>
                <span className="text-right text-slate-200">
                  {article.is_internal ? "Internal" : "Public"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className="text-right text-slate-200">
                  {article.is_draft ? "Draft" : "Published"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded border border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Paperclip className="h-4 w-4 text-orange-300" />
              <h2 className="text-sm font-semibold text-white">
                Files ({attachments.length})
              </h2>
            </div>
            <div className="p-4">
              <AttachmentManager
                attachments={attachments}
                articleId={article.id}
                canManage={canEdit(profile.role)}
              />
            </div>
          </section>

          <section className="rounded border border-slate-800 bg-slate-950/80">
            <div className="border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Related Articles ({relatedArticles.length})
              </h2>
            </div>
            <div className="space-y-1 p-3">
              {relatedArticles.length === 0 && (
                <p className="px-1 py-3 text-sm text-slate-500">
                  No related articles in this category.
                </p>
              )}

              {relatedArticles.map((item) => (
                <Link
                  key={item.id}
                  href={`/articles/${item.id}`}
                  className="block rounded px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-orange-200"
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
