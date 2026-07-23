"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckSquare2,
  CircleDot,
  Lightbulb,
  LoaderCircle,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { deleteRecord, updateRecord } from "@/lib/pocketbase/client";
import { isWorkItemOverdue, sortWorkItems } from "@/lib/work-items";
import type { WorkItem } from "@/types/database";

const kindDetails = {
  task: { label: "Task", icon: CheckSquare2, tone: "text-orange-200 bg-orange-500/10 ring-orange-500/25" },
  note: { label: "Note", icon: NotebookPen, tone: "text-sky-200 bg-sky-500/10 ring-sky-500/25" },
  idea: { label: "Idea", icon: Lightbulb, tone: "text-violet-200 bg-violet-500/10 ring-violet-500/25" },
} as const;

function formatDueDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

export default function WorkItemBoard({ items }: { items: WorkItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const orderedItems = useMemo(() => sortWorkItems(items).slice(0, 8), [items]);
  const openCount = items.filter((item) => item.status === "open").length;

  async function toggleDone(item: WorkItem) {
    if (pendingId) return;
    setPendingId(item.id);
    try {
      await updateRecord("work_items", item.id, {
        status: item.status === "done" ? "open" : "done",
        updated_at: new Date().toISOString(),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function remove(item: WorkItem) {
    if (pendingId || !window.confirm(`Remove "${item.title}"?`)) return;
    setPendingId(item.id);
    try {
      await deleteRecord("work_items", item.id);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="surface-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Follow-ups</h2>
          <p className="mt-1 text-xs text-slate-500">
            {openCount === 0 ? "Nothing pressing right now." : `${openCount} open item${openCount === 1 ? "" : "s"}.`}
          </p>
        </div>
        <CircleDot className="h-4 w-4 text-orange-300" />
      </div>

      <div className="space-y-1.5 p-3">
        {orderedItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-7 text-center">
            <p className="text-sm text-slate-400">Your workbench is clear.</p>
            <p className="mt-1 text-xs text-slate-600">Capture tasks, notes, and ideas above.</p>
          </div>
        )}

        {orderedItems.map((item) => {
          const detail = kindDetails[item.kind];
          const Icon = detail.icon;
          const overdue = isWorkItemOverdue(item);
          const isPending = pendingId === item.id;

          return (
            <div
              key={item.id}
              className={`group flex items-start gap-2 rounded-xl border px-2.5 py-2.5 transition ${
                item.status === "done"
                  ? "border-slate-800/70 bg-slate-950/40 opacity-65"
                  : overdue
                    ? "border-red-500/25 bg-red-500/[0.04]"
                    : "border-slate-800 bg-slate-900/35 hover:border-orange-500/35 hover:bg-orange-500/[0.05]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleDone(item)}
                disabled={isPending}
                title={item.status === "done" ? "Reopen item" : "Mark complete"}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                  item.status === "done"
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                    : "border-slate-600 text-transparent hover:border-orange-400 hover:bg-orange-500/10 hover:text-orange-200"
                }`}
              >
                {isPending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-semibold ring-1 ${detail.tone}`}>
                    <Icon className="h-3 w-3" />
                    {detail.label}
                  </span>
                  {item.due_at && (
                    <span className={`text-[11px] font-medium ${overdue ? "text-red-300" : "text-slate-500"}`}>
                      {overdue ? "Overdue " : "Due "}{formatDueDate(item.due_at)}
                    </span>
                  )}
                </div>
                <p className={`mt-1 truncate text-sm font-medium ${item.status === "done" ? "text-slate-500 line-through" : "text-slate-100"}`}>
                  {item.title}
                </p>
                {item.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.note}</p>}
                {item.article_id && (
                  <Link href={`/articles/${item.article_id}`} className="mt-1.5 inline-flex text-xs font-medium text-orange-300 hover:text-orange-200">
                    Open linked article
                  </Link>
                )}
              </div>

              {item.status === "done" && (
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={isPending}
                  title="Delete completed item"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}