"use client";

import { useState } from "react";
import { BookmarkPlus, LoaderCircle, Save, X } from "lucide-react";
import type { ArticleFormFields } from "@/lib/article-editing";
import { createRecord, getCurrentAuth } from "@/lib/pocketbase/client";

export default function SaveArticleTemplateButton({
  fields,
}: {
  fields: ArticleFormFields;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const auth = getCurrentAuth();
      await createRecord("article_templates", {
        name: name.trim(),
        description: description.trim(),
        title: fields.title.trim() || name.trim(),
        summary: fields.summary,
        content: fields.content,
        category: fields.category || "General",
        company_id: fields.companyId || null,
        tags: fields.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_pinned: fields.isPinned,
        is_internal: fields.isInternal,
        created_by: auth?.user.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setOpen(false);
      setName("");
      setDescription("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
      >
        <BookmarkPlus className="h-4 w-4" />
        Save as Template
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={saveTemplate}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
            className="w-full max-w-lg rounded border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">Reusable workflow</p>
                <h2 id="template-dialog-title" className="mt-1 text-lg font-semibold text-white">
                  Save article as template
                </h2>
              </div>
              <button
                type="button"
                title="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 transition hover:bg-slate-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Template name</label>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. VPS handover"
                  className="h-10 w-full rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="When this template is useful"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center rounded border border-slate-700 px-3 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save template
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
