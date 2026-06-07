"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";

export type GeneratedArticleDraft = {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
};

type Props = {
  currentTitle: string;
  currentSummary: string;
  currentContent: string;
  currentCategory: string;
  currentTags: string;
  onApply: (draft: GeneratedArticleDraft) => void;
};

const PROMPT_IDEAS = [
  "Create a VPS storage usage check KB with Linux commands and troubleshooting steps.",
  "Turn this into a clean onboarding checklist for a new client workstation.",
  "Write a step-by-step incident response KB for a failed backup alert.",
];

export default function AiArticleDraftButton({
  currentTitle,
  currentSummary,
  currentContent,
  currentCategory,
  currentTags,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<GeneratedArticleDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasExistingContent =
    currentTitle.trim() ||
    currentSummary.trim() ||
    currentContent.replace(/<[^>]+>/g, "").trim();

  async function generateDraft() {
    setLoading(true);
    setError("");
    setDraft(null);

    try {
      const response = await fetch("/api/ai/article-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          existing: {
            title: currentTitle,
            summary: currentSummary,
            content: currentContent,
            category: currentCategory,
            tags: currentTags,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        draft?: GeneratedArticleDraft;
        error?: string;
      };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "Unable to generate an article draft.");
      }

      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate an article draft.");
    } finally {
      setLoading(false);
    }
  }

  function applyDraft() {
    if (
      hasExistingContent &&
      !window.confirm("Apply this AI draft and replace the current title, summary, and body?")
    ) {
      return;
    }

    if (draft) {
      onApply(draft);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded border border-orange-400/35 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-100 shadow-sm shadow-orange-950/30 transition hover:border-orange-300 hover:bg-orange-500/15"
      >
        <Sparkles className="h-4 w-4" />
        AI Draft
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                  AI article builder
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">Generate a KB draft</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-slate-700 p-2 text-slate-300 transition hover:border-orange-400/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={6}
                    placeholder="Describe the KB you want. Include audience, systems, commands, risks, or tone."
                    className="w-full rounded border border-slate-700 bg-slate-900/80 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {PROMPT_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-orange-400/50 hover:text-orange-100"
                    >
                      {idea}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={generateDraft}
                  disabled={loading || prompt.trim().length < 4}
                  className="inline-flex items-center gap-2 rounded bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {loading ? "Generating..." : "Generate Draft"}
                </button>
              </div>

              <aside className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
                <p className="text-sm font-semibold text-white">How it applies</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The draft can fill the title, summary, body, folder, and tags. You still review it before publishing.
                </p>
                <div className="mt-4 rounded border border-orange-400/20 bg-orange-500/10 p-3 text-xs leading-5 text-orange-100/85">
                  Tip: mention exact tools, commands, operating system, and whether this is for a central KB or a client KB.
                </div>
              </aside>
            </div>

            {draft && (
              <div className="border-t border-slate-800 px-5 py-4">
                <div className="rounded-lg border border-slate-800 bg-black/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Preview
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{draft.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{draft.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-100">
                      {draft.category || "General"}
                    </span>
                    {draft.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={applyDraft}
                    className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
                  >
                    Apply Draft
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
