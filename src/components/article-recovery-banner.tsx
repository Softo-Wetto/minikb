"use client";

import { History, RotateCcw, X } from "lucide-react";
import type { RecoverySnapshot } from "@/lib/article-editing";

export default function ArticleRecoveryBanner({
  snapshot,
  onRestore,
  onDiscard,
}: {
  snapshot: RecoverySnapshot;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/5 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-400/10 text-amber-200">
          <History className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-50">Recovery draft found</p>
          <p className="mt-0.5 text-sm text-amber-100/70">
            {snapshot.title ? `Restore changes for "${snapshot.title}" from this browser, or discard them.` : "Restore the locally saved changes from this browser, or discard them."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-amber-200/20 px-2.5 text-xs font-semibold text-amber-100/80 transition hover:border-amber-200/40 hover:text-amber-50"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex h-8 items-center gap-1.5 rounded bg-amber-300 px-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
      </div>
    </section>
  );
}
