"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ListTree, Printer } from "lucide-react";

type Heading = {
  id: string;
  text: string;
  level: number;
};

export default function ArticleUtilities({
  articleId,
  title,
}: {
  articleId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("minikb_recent_articles");
    const current = { id: articleId, title, viewedAt: new Date().toISOString() };
    const previous = stored ? (JSON.parse(stored) as typeof current[]) : [];
    const next = [
      current,
      ...previous.filter((item) => item.id !== articleId),
    ].slice(0, 8);

    window.localStorage.setItem("minikb_recent_articles", JSON.stringify(next));
    window.dispatchEvent(new Event("minikb-recent-articles"));
  }, [articleId, title]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(".article-content h1, .article-content h2, .article-content h3")
      );

      const collected = nodes
        .map((node, index) => {
          const text = node.textContent?.trim() || "";
          if (!text) return null;

          const id =
            node.id ||
            `${text
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .trim()
              .replace(/\s+/g, "-")}-${index}`;

          node.id = id;

          return {
            id,
            text,
            level: Number(node.tagName.replace("H", "")),
          };
        })
        .filter(Boolean) as Heading[];

      setHeadings(collected);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [articleId]);

  useEffect(() => {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0);
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="rounded border border-slate-800 bg-slate-950/80">
      <div className="h-1 bg-slate-900">
        <div
          className="h-full bg-orange-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-2 border-b border-slate-800 p-3">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 text-sm font-medium text-slate-200 transition hover:border-orange-500/50 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Link"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded border border-slate-700 bg-slate-900 text-sm font-medium text-slate-200 transition hover:border-orange-500/50 hover:text-white"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <ListTree className="h-4 w-4 text-orange-300" />
          <h2 className="text-sm font-semibold text-white">On This Page</h2>
        </div>

        {headings.length === 0 ? (
          <p className="text-sm text-slate-500">No headings in this article.</p>
        ) : (
          <nav className="space-y-1">
            {headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                className={`block rounded py-1.5 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-orange-200 ${
                  heading.level > 2 ? "pl-5" : "px-2"
                }`}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
