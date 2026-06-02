"use client";

import { useMemo, useState } from "react";
import ArticleFolderPicker from "@/components/article-folder-picker";
import RichTextEditor from "@/components/rich-text-editor";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { updateRecord } from "@/lib/pocketbase/client";

type Article = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  is_pinned: boolean | null;
  is_internal: boolean | null;
  is_draft?: boolean | null;
};

export default function EditArticleForm({
  article,
}: {
  article: Article;
}) {
  const [title, setTitle] = useState(article.title || "");
  const [summary, setSummary] = useState(article.summary || "");
  const [content, setContent] = useState(article.content || "<p></p>");
  const [category, setCategory] = useState(article.category || "General");
  const [tags, setTags] = useState((article.tags || []).join(", "));
  const [isPinned, setIsPinned] = useState(!!article.is_pinned);
  const [isInternal, setIsInternal] = useState(article.is_internal ?? true);
  const [isDraft, setIsDraft] = useState(!!article.is_draft);
  const [savingMode, setSavingMode] = useState<"publish" | "draft" | null>(null);

  const originalTags = useMemo(() => (article.tags || []).join(", "), [article.tags]);

  const isDirty = useMemo(() => {
    return (
      title !== (article.title || "") ||
      summary !== (article.summary || "") ||
      content !== (article.content || "<p></p>") ||
      category !== (article.category || "General") ||
      tags !== originalTags ||
      isPinned !== !!article.is_pinned ||
      isInternal !== (article.is_internal ?? true) ||
      isDraft !== !!article.is_draft
    );
  }, [
    article.category,
    article.content,
    article.is_internal,
    article.is_draft,
    article.is_pinned,
    article.summary,
    article.title,
    category,
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

  const lastAutosaved = useMemo(() => {
    return new Date().toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const folderOptions = useMemo(() => {
    return Array.from(new Set(["General", article.category || "General"].filter(Boolean)));
  }, [article.category]);

  async function saveArticle(e: React.FormEvent | React.MouseEvent, draft: boolean) {
    e.preventDefault();
    setSavingMode(draft ? "draft" : "publish");

    try {
      await updateRecord("articles", article.id, {
        title,
        summary,
        content,
        category,
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
      allowNextNavigation();
      window.location.href = `/articles/${article.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update article.");
      setSavingMode(null);
    }
  }

  return (
    <form onSubmit={(event) => saveArticle(event, false)} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded border border-zinc-800 bg-black">
        <div className="border-b border-zinc-800 px-4 py-3">
          <label className="mb-2 block text-sm font-medium text-white">
            Name<span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-4 py-3 text-3xl font-medium text-white outline-none"
          />
        </div>

        <div className="border-b border-zinc-800 px-4 py-3">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-200 outline-none"
          />
        </div>

        <div className="px-4 py-4">
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </section>

      <aside className="rounded border border-zinc-800 bg-zinc-900/70">
        <div className="border-b border-zinc-800 px-4 py-4">
          <div className="text-sm text-zinc-300">
            <span className="font-semibold">Last autosaved:</span> {lastAutosaved}
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="submit"
              disabled={!!savingMode}
              className="w-full rounded bg-[#f04b23] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {savingMode === "publish" ? "Publishing..." : "Publish"}
            </button>

            <button
              type="button"
              disabled={!!savingMode}
              onClick={(event) => saveArticle(event, true)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-500/60 hover:text-orange-200 disabled:opacity-50"
            >
              {savingMode === "draft" ? "Saving draft..." : "Save Draft"}
            </button>

            <a
              href={`/articles/${article.id}`}
              className="block w-full rounded border border-[#f04b23] px-4 py-3 text-center text-sm font-semibold text-[#f04b23] hover:bg-[#f04b23]/10"
            >
              Close
            </a>
          </div>
        </div>

        <div className="px-4 py-5">
          <h2 className="mb-4 text-2xl font-semibold text-white">Meta</h2>

          <div className="space-y-4">
            <ArticleFolderPicker
              value={category}
              folders={folderOptions}
              onChange={setCategory}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Tags
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma, separated, tags"
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              Pinned
            </label>

            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              Internal only
            </label>

            <div className="rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
              Status: <span className="font-semibold text-white">{isDraft ? "Draft" : "Live"}</span>
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
