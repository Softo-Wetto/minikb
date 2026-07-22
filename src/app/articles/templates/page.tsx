import Link from "next/link";
import { ArrowLeft, Layers3, Plus } from "lucide-react";
import ArticleTemplateManager from "@/components/article-template-manager";
import { requireEditor } from "@/lib/auth";
import { getRecords } from "@/lib/pocketbase/server";
import type { ArticleTemplate } from "@/types/database";

export default async function ArticleTemplatesPage() {
  const user = await requireEditor();
  let templates: ArticleTemplate[] = [];

  try {
    const response = await getRecords<ArticleTemplate>("article_templates", {
      sort: "name",
      perPage: 200,
    });
    templates = response.items;
  } catch {
    templates = [];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/articles"
          className="group inline-flex h-9 items-center gap-2 rounded border border-slate-800 bg-slate-950/70 px-3 text-sm font-medium text-slate-300 transition hover:border-orange-500/45 hover:text-orange-200"
        >
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
          Articles
        </Link>
        <Link
          href="/articles/new"
          className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          <Plus className="h-4 w-4" />
          New article
        </Link>
      </div>

      <section className="overflow-hidden rounded border border-slate-800 bg-slate-950/85">
        <div className="border-b border-slate-800 bg-slate-900/35 px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-orange-500/10 text-orange-200">
              <Layers3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">Knowledge base library</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Article Templates</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Keep repeatable article structures ready for the next client, handover, or procedure.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <ArticleTemplateManager templates={templates} canDelete={user.role === "admin"} />
        </div>
      </section>
    </div>
  );
}
