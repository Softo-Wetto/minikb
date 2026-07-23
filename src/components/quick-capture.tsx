"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare2, Lightbulb, LoaderCircle, NotebookPen } from "lucide-react";
import { createRecord, getCurrentAuth } from "@/lib/pocketbase/client";
import type { WorkItemKind } from "@/types/database";

const captureKinds: Array<{
  value: WorkItemKind;
  label: string;
  icon: typeof CheckSquare2;
}> = [
  { value: "task", label: "Task", icon: CheckSquare2 },
  { value: "note", label: "Note", icon: NotebookPen },
  { value: "idea", label: "Idea", icon: Lightbulb },
];

export default function QuickCapture() {
  const router = useRouter();
  const [kind, setKind] = useState<WorkItemKind>("task");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSaving) return;

    setIsSaving(true);
    setError("");
    const now = new Date().toISOString();

    try {
      await createRecord("work_items", {
        kind,
        status: "open",
        title: cleanTitle,
        note: note.trim(),
        due_at: dueAt ? new Date(`${dueAt}T00:00:00`).toISOString() : null,
        created_by: getCurrentAuth()?.user.id || null,
        created_at: now,
        updated_at: now,
      });
      setTitle("");
      setNote("");
      setDueAt("");
      setIsExpanded(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to capture this item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="surface-card rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Quick Capture</h2>
          <p className="mt-1 text-xs text-slate-500">
            Get it out of your head before it disappears.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          {captureKinds.map((option) => {
            const Icon = option.icon;
            const active = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-semibold transition ${
                  active
                    ? "bg-orange-500/15 text-orange-200 shadow-sm"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={submit} className="p-3">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              kind === "task"
                ? "Add a follow-up..."
                : kind === "note"
                  ? "Capture a note..."
                  : "Capture an idea..."
            }
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70"
          />
          <button
            type="submit"
            disabled={!title.trim() || isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Add"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="mt-2 text-xs font-medium text-slate-500 transition hover:text-orange-200"
        >
          {isExpanded ? "Hide details" : "Add details or a due date"}
        </button>

        {isExpanded && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="A little context helps later."
              className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-orange-500/70"
            />
            <label className="text-xs font-medium text-slate-500">
              Due date
              <input
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 text-sm text-slate-200 outline-none focus:border-orange-500/70"
              />
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      </form>
    </section>
  );
}