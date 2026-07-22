"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Layers3, WandSparkles } from "lucide-react";
import type { ArticleTemplate } from "@/types/database";

export default function ArticleTemplatePicker({
  templates,
  initialTemplateId,
  hasContent,
  onApply,
}: {
  templates: ArticleTemplate[];
  initialTemplateId?: string;
  hasContent: boolean;
  onApply: (template: ArticleTemplate) => void;
}) {
  const [selectedId, setSelectedId] = useState(initialTemplateId || "");
  const didApplyInitial = useRef(false);

  useEffect(() => {
    if (!initialTemplateId || didApplyInitial.current) return;
    const template = templates.find((item) => item.id === initialTemplateId);
    if (!template) return;

    didApplyInitial.current = true;
    onApply(template);
  }, [initialTemplateId, onApply, templates]);

  function applySelectedTemplate() {
    const template = templates.find((item) => item.id === selectedId);
    if (!template) return;

    if (
      hasContent &&
      !window.confirm("Apply this template? Your current unsaved article fields will be replaced.")
    ) {
      return;
    }

    onApply(template);
  }

  return (
    <section className="border-b border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-orange-500/10 text-orange-200">
            <Layers3 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Start from a template</p>
            <p className="text-xs text-zinc-500">Apply a repeatable structure, then make it your own.</p>
          </div>
        </div>
        <Link
          href="/articles/templates"
          className="text-xs font-semibold text-orange-200 transition hover:text-orange-100"
        >
          Manage templates
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="h-9 min-w-52 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-orange-400"
          aria-label="Article template"
        >
          <option value="">Choose a template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={applySelectedTemplate}
          disabled={!selectedId}
          className="inline-flex h-9 items-center gap-2 rounded border border-orange-400/35 bg-orange-500/10 px-3 text-sm font-semibold text-orange-100 transition hover:border-orange-300 hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <WandSparkles className="h-4 w-4" />
          Apply
        </button>
      </div>
      {templates.length === 0 && (
        <p className="mt-3 text-xs text-zinc-500">No templates yet. Save a useful article as your first one.</p>
      )}
    </section>
  );
}
