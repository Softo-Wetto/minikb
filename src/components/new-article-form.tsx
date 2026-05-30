"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import RichTextEditor from "@/components/rich-text-editor";
import { createRecord, getCurrentAuth } from "@/lib/pocketbase/client";
import type { Article } from "@/types/database";

type Company = {
  id: string;
  name: string;
};

export default function NewArticleForm({
  companies,
  folders,
  initialCompanyId = "",
}: {
  companies: Company[];
  folders: string[];
  initialCompanyId?: string;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [category, setCategory] = useState(folders[0] || "General");
  const [tags, setTags] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [isPinned, setIsPinned] = useState(false);
  const [isInternal, setIsInternal] = useState(true);
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

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const auth = getCurrentAuth();

    const payload: Record<string, unknown> = {
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      summary: summary || "",
      content,
      category: category || "General",
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_pinned: isPinned,
      is_internal: isInternal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (companyId) {
      payload.company_id = companyId;
    }

    if (auth?.user.id) {
      payload.created_by = auth.user.id;
    }

    try {
      const data = await createRecord<Pick<Article, "id">>("articles", payload);
      window.location.href = `/articles/${data.id}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create article.");
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

            <Link
              href="/articles"
              className="block w-full rounded border border-[#f04b23] px-4 py-3 text-center text-sm font-semibold text-[#f04b23] hover:bg-[#f04b23]/10"
            >
              Close
            </Link>
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
                {folders.length === 0 ? (
                  <option value="General">No folder</option>
                ) : (
                  <>
                    <option value="General">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
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
