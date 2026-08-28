"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Eye,
  FileText,
  LockKeyhole,
  Pin,
  Save,
  Tags,
} from "lucide-react";
import AiArticleDraftButton from "@/components/ai-article-draft-button";
import ArticleFolderPicker from "@/components/article-folder-picker";
import ArticleRecoveryBanner from "@/components/article-recovery-banner";
import ArticleRevisionHistory from "@/components/article-revision-history";
import ArticleTemplatePicker from "@/components/article-template-picker";
import SaveArticleTemplateButton from "@/components/save-article-template-button";
import DeleteArticleButton from "@/components/delete-article-button";
import RichTextEditor from "@/components/rich-text-editor";
import { useArticleRecovery } from "@/hooks/use-article-recovery";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  hasMeaningfulRecovery,
  templateToArticleFields,
  trimRevisions,
  type ArticleFormFields,
} from "@/lib/article-editing";
import {
  createRecord,
  deleteRecord,
  getClientRecords,
  getCurrentAuth,
  updateRecord,
} from "@/lib/pocketbase/client";
import type { ArticleRevision, ArticleTemplate, RawPocketBaseRecord } from "@/types/database";
import { formatDateTime } from "@/lib/utils";

type Article = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  company_id: string | null;
  category: string | null;
  tags: string[] | null;
  is_pinned: boolean | null;
  is_internal: boolean | null;
  is_draft?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ArticleLinkOption = {
  id: string;
  title: string;
};

type CompanyOption = {
  id: string;
  name: string;
};

export default function EditArticleForm({
  article,
  companies,
  folders,
  revisions,
  templates,
  articleOptions,
}: {
  article: Article;
  companies: CompanyOption[];
  folders: string[];
  revisions: ArticleRevision[];
  templates: ArticleTemplate[];
  articleOptions: ArticleLinkOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(article.title || "");
  const [summary, setSummary] = useState(article.summary || "");
  const [content, setContent] = useState(article.content || "<p></p>");
  const [category, setCategory] = useState(article.category || "General");
  const [tags, setTags] = useState((article.tags || []).join(", "));
  const [companyId, setCompanyId] = useState(article.company_id || "");
  const [isPinned, setIsPinned] = useState(!!article.is_pinned);
  const [isInternal, setIsInternal] = useState(article.is_internal ?? true);
  const [isDraft, setIsDraft] = useState(!!article.is_draft);
  const [previewing, setPreviewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingMode, setSavingMode] = useState<"publish" | "draft" | null>(null);

  const originalTags = useMemo(() => (article.tags || []).join(", "), [article.tags]);

  const isDirty = useMemo(() => {
    return (
      title !== (article.title || "") ||
      summary !== (article.summary || "") ||
      content !== (article.content || "<p></p>") ||
      category !== (article.category || "General") ||
      tags !== originalTags ||
      companyId !== (article.company_id || "") ||
      isPinned !== !!article.is_pinned ||
      isInternal !== (article.is_internal ?? true) ||
      isDraft !== !!article.is_draft
    );
  }, [
    article.category,
    article.company_id,
    article.content,
    article.is_internal,
    article.is_draft,
    article.is_pinned,
    article.summary,
    article.title,
    category,
    companyId,
    content,
    isInternal,
    isDraft,
    isPinned,
    originalTags,
    summary,
    tags,
    title,
  ]);

  const allowNextNavigation = useUnsavedChangesGuard(isDirty);

  const formFields = useMemo<ArticleFormFields>(
    () => ({
      title,
      summary,
      content,
      category,
      tags,
      companyId,
      isPinned,
      isInternal,
      isDraft,
    }),
    [category, companyId, content, isDraft, isInternal, isPinned, summary, tags, title]
  );
  const { recovery, clearRecovery, discardRecovery } = useArticleRecovery({
    articleId: article.id,
    fields: formFields,
    isDirty,
    serverUpdatedAt: article.updated_at || article.created_at,
  });

  function applyFormFields(fields: ArticleFormFields) {
    setTitle(fields.title);
    setSummary(fields.summary);
    setContent(fields.content);
    setCategory(fields.category || "General");
    setTags(fields.tags);
    setCompanyId(fields.companyId);
    setIsPinned(fields.isPinned);
    setIsInternal(fields.isInternal);
    setIsDraft(fields.isDraft);
  }

  function restoreRevision(revision: ArticleRevision) {
    applyFormFields({
      title: revision.title,
      summary: revision.summary || "",
      content: revision.content,
      category: revision.category || "General",
      tags: (revision.tags || []).join(", "),
      companyId: revision.company_id || "",
      isPinned: revision.is_pinned,
      isInternal: revision.is_internal,
      isDraft: revision.is_draft,
    });
  }

  function applyTemplate(template: ArticleTemplate) {
    applyFormFields(templateToArticleFields(template, companyId));
  }
  const stats = useMemo(() => {
    const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = plain ? plain.split(" ").length : 0;
    return {
      words,
      readTime: `${Math.max(1, Math.round(words / 200))} min`,
    };
  }, [content]);

  const uniqueFolders = useMemo(() => {
    return Array.from(new Set(["General", ...folders, category].filter(Boolean)));
  }, [category, folders]);

  async function saveArticle(e: React.FormEvent | React.MouseEvent, draft: boolean) {
    e.preventDefault();
    setSavingMode(draft ? "draft" : "publish");

    try {
      const response = await getClientRecords<RawPocketBaseRecord & ArticleRevision>(
        "article_revisions",
        new URLSearchParams({
          filter: `article_id = "${article.id}"`,
          sort: "-revision_number",
          perPage: "30",
        })
      );
      const priorRevisions = response.items;
      const revisionNumber =
        Math.max(0, ...priorRevisions.map((revision) => Number(revision.revision_number) || 0)) +
        1;
      const auth = getCurrentAuth();
      const revision = await createRecord<RawPocketBaseRecord & ArticleRevision>(
        "article_revisions",
        {
          article_id: article.id,
          revision_number: revisionNumber,
          title: article.title,
          summary: article.summary || "",
          content: article.content,
          category: article.category || "General",
          company_id: article.company_id || null,
          tags: article.tags || [],
          is_pinned: !!article.is_pinned,
          is_internal: article.is_internal ?? true,
          is_draft: !!article.is_draft,
          save_mode: article.is_draft ? "draft" : "publish",
          created_by: auth?.user.id || null,
          created_at: new Date().toISOString(),
        }
      );

      const retainedIds = new Set(
        trimRevisions([...priorRevisions, revision], 30).map((item) => item.id)
      );
      const staleRevisions = [...priorRevisions, revision].filter(
        (item) => !retainedIds.has(item.id)
      );
      if (staleRevisions.length) {
        try {
          await Promise.all(
            staleRevisions.map((item) => deleteRecord("article_revisions", item.id))
          );
        } catch (error) {
          console.warn("Unable to trim old article revisions", error);
        }
      }

      await updateRecord("articles", article.id, {
        title,
        summary,
        content,
        category: category || "General",
        company_id: companyId || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_pinned: isPinned,
        is_internal: isInternal,
        is_draft: draft,
        updated_at: new Date().toISOString(),
      });
      setIsDraft(draft);
      clearRecovery();
      allowNextNavigation();
      router.push(`/articles/${article.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update article.");
      setSavingMode(null);
    }
  }
  async function copyArticleLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/articles/${article.id}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <form
      onSubmit={(event) => saveArticle(event, false)}
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <section className="min-w-0 overflow-visible rounded border border-slate-800 bg-slate-950/85">
        {recovery && (
          <ArticleRecoveryBanner
            snapshot={recovery}
            onRestore={() => {
              applyFormFields(recovery);
              discardRecovery();
            }}
            onDiscard={discardRecovery}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <Link
            href={`/articles/${article.id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to article
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreviewing((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <Eye className="h-4 w-4" />
              {previewing ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              onClick={copyArticleLink}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy Link"}
            </button>
            <SaveArticleTemplateButton fields={formFields} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">AI draft assistant</p>
            <p className="text-sm text-slate-500">
              Generate a new draft from a prompt and apply it to this article.
            </p>
          </div>
          <AiArticleDraftButton
            currentTitle={title}
            currentSummary={summary}
            currentContent={content}
            currentCategory={category}
            currentTags={tags}
            onApply={(draft) => {
              setTitle(draft.title);
              setSummary(draft.summary);
              setContent(draft.content);
              setCategory(draft.category || "General");
              setTags(draft.tags.join(", "));
            }}
          />
        </div>

        <div className="border-b border-slate-800 px-4 py-4">
          <label className="mb-2 block text-sm font-medium text-white">
            Name<span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-slate-800 bg-slate-900/70 px-4 py-3 text-3xl font-medium text-white outline-none transition focus:border-orange-500/70"
          />
        </div>

        <div className="border-b border-slate-800 px-4 py-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-200 outline-none transition focus:border-orange-500/70"
          />
        </div>

        <div className="p-4">
          {previewing ? (
            <article className="min-h-[520px] rounded border border-slate-800 bg-slate-950 px-6 py-6">
              <div className="article-content">
                <h1>{title || "Untitled article"}</h1>
                {summary && <p>{summary}</p>}
                <div dangerouslySetInnerHTML={{ __html: content || "" }} />
              </div>
            </article>
          ) : (
            <RichTextEditor value={content} onChange={setContent} articleOptions={articleOptions} />
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded border border-slate-800 bg-slate-950/85">
          <div className="border-b border-slate-800 px-4 py-4">
            <div className="text-sm text-slate-300">
              <span className="font-semibold">Last updated:</span>{" "}
              {formatDateTime(article.updated_at || article.created_at)}
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="submit"
                disabled={!!savingMode}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingMode === "publish" ? "Publishing..." : "Publish Changes"}
              </button>

              <button
                type="button"
                disabled={!!savingMode}
                onClick={(event) => saveArticle(event, true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-500/60 hover:text-orange-200 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {savingMode === "draft" ? "Saving draft..." : "Save Draft"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4">
            <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-500">Words</p>
              <p className="mt-1 text-xl font-semibold text-white">{stats.words}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-500">Read Time</p>
              <p className="mt-1 text-xl font-semibold text-white">{stats.readTime}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {isDraft ? "Draft" : "Live"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded border border-slate-800 bg-slate-950/85">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
            <FileText className="h-4 w-4 text-orange-300" />
            <h2 className="text-sm font-semibold text-white">Article Meta</h2>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <ArticleFolderPicker
              value={category}
              folders={uniqueFolders}
              onChange={setCategory}
            />

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                <Tags className="h-4 w-4 text-orange-300" />
                Tags
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma, separated, tags"
                className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
              />
            </div>
          </div>
        </section>

        <section className="rounded border border-slate-800 bg-slate-950/85 p-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/40 px-3 py-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Pin className="h-4 w-4 text-orange-300" />
                Pinned
              </span>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/40 px-3 py-3 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-orange-300" />
                Internal only
              </span>
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
            </label>
          </div>
        </section>

        <ArticleTemplatePicker
          templates={templates}
          hasContent={hasMeaningfulRecovery(formFields)}
          onApply={applyTemplate}
        />

        <ArticleRevisionHistory revisions={revisions} onRestore={restoreRevision} />

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
      </aside>
    </form>
  );
}
