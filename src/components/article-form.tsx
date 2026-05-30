"use client";

import { useMemo, useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
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
  const [saving, setSaving] = useState(false);

  const lastAutosaved = useMemo(() => {
    return new Date().toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

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
        updated_at: new Date().toISOString(),
      });
      window.location.href = `/articles/${article.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update article.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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
              disabled={saving}
              className="w-full rounded bg-[#f04b23] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Publishing..." : "Publish"}
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
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Folder
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="General">No folder</option>
                <option value="Microsoft 365">Microsoft 365</option>
                <option value="Windows">Windows</option>
                <option value="Zoho">Zoho</option>
                <option value="CRM">CRM</option>
                <option value="Veeam">Veeam</option>
                <option value="Networking">Networking</option>
                <option value="Hosting">Hosting</option>
              </select>
            </div>

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
          </div>
        </div>
      </aside>
    </form>
  );
}
