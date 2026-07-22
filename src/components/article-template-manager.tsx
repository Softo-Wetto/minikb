"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Pencil, Save, Trash2 } from "lucide-react";
import { deleteRecord, updateRecord } from "@/lib/pocketbase/client";
import type { ArticleTemplate } from "@/types/database";

export default function ArticleTemplateManager({
  templates,
  canDelete,
}: {
  templates: ArticleTemplate[];
  canDelete: boolean;
}) {
  const [items, setItems] = useState(templates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  function startEditing(template: ArticleTemplate) {
    setEditingId(template.id);
    setDraftName(template.name);
    setDraftDescription(template.description || "");
  }

  async function saveTemplate(template: ArticleTemplate) {
    setSavingId(template.id);
    try {
      const updated = await updateRecord<ArticleTemplate>("article_templates", template.id, {
        name: draftName.trim() || template.name,
        description: draftDescription.trim(),
        updated_at: new Date().toISOString(),
      });
      setItems((current) => current.map((item) => (item.id === template.id ? updated : item)));
      setEditingId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update template.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeTemplate(template: ArticleTemplate) {
    if (!window.confirm(`Delete the "${template.name}" template? This cannot be undone.`)) return;

    setSavingId(template.id);
    try {
      await deleteRecord("article_templates", template.id);
      setItems((current) => current.filter((item) => item.id !== template.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete template.");
    } finally {
      setSavingId(null);
    }
  }

  if (!items.length) {
    return (
      <section className="rounded border border-dashed border-slate-700 bg-slate-950/55 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-slate-200">No reusable templates yet.</p>
        <p className="mt-2 text-sm text-slate-500">Open an article and save a repeatable structure as a template.</p>
        <Link
          href="/articles/new"
          className="mt-5 inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          Create article
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((template) => {
        const isEditing = editingId === template.id;
        const isSaving = savingId === template.id;

        return (
          <article key={template.id} className="rounded border border-slate-800 bg-slate-950/80 p-4 transition hover:border-slate-700">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  className="h-9 w-full rounded border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-white outline-none focus:border-orange-400"
                />
                <textarea
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-orange-400"
                />
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-white">{template.name}</p>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-400">
                  {template.description || template.summary || "Reusable article structure."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded border border-slate-800 px-2 py-1">{template.category || "General"}</span>
                  {template.company_id && <span className="rounded border border-slate-800 px-2 py-1">Client default</span>}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/articles/new?template=${encodeURIComponent(template.id)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded border border-orange-400/30 px-2.5 text-xs font-semibold text-orange-100 transition hover:border-orange-300 hover:bg-orange-500/10"
              >
                Use template
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveTemplate(template)}
                    disabled={isSaving}
                    className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-700 px-2.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400 hover:text-orange-100 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex h-8 items-center rounded px-2.5 text-xs font-semibold text-slate-400 transition hover:text-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(template)}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit details
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  title="Delete template"
                  onClick={() => removeTemplate(template)}
                  disabled={isSaving}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded border border-red-500/25 text-red-200 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
