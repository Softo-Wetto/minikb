"use client";

import { History, RotateCcw } from "lucide-react";
import type { ArticleRevision } from "@/types/database";

export default function ArticleRevisionHistory({
  revisions,
  onRestore,
}: {
  revisions: ArticleRevision[];
  onRestore: (revision: ArticleRevision) => void;
}) {
  return (
    <section className="rounded border border-slate-800 bg-slate-950/85">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <History className="h-4 w-4 text-orange-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Revision History</h2>
          <p className="text-xs text-slate-500">Restore a previous state, then save when ready.</p>
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {revisions.length ? (
          revisions.slice(0, 10).map((revision) => (
            <div key={revision.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  Revision {revision.revision_number}: {revision.title || "Untitled article"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {revision.save_mode === "draft" ? "Draft save" : "Published change"}
                </p>
              </div>
              <button
                type="button"
                title={`Restore revision ${revision.revision_number}`}
                onClick={() => onRestore(revision)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-slate-700 px-2.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/60 hover:text-orange-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            </div>
          ))
        ) : (
          <p className="px-4 py-5 text-sm text-slate-500">No saved revisions yet.</p>
        )}
      </div>
    </section>
  );
}
