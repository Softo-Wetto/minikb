"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Loader2, Save } from "lucide-react";
import {
  createRecord,
  getCurrentAuth,
  updateRecord,
} from "@/lib/pocketbase/client";
import type { Company, RawPocketBaseRecord } from "@/types/database";

type CompanyFormProps = {
  mode: "create" | "edit";
  company?: Company;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function CompanyForm({ mode, company }: CompanyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(company?.name ?? "");
  const [website, setWebsite] = useState(company?.website ?? "");
  const [description, setDescription] = useState(company?.description ?? "");
  const [saving, setSaving] = useState(false);

  const normalizedWebsite = useMemo(() => normalizeWebsite(website), [website]);
  const isEdit = mode === "edit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) return;

    setSaving(true);
    const auth = getCurrentAuth();
    const now = new Date().toISOString();

    const payload = {
      name: cleanName,
      slug: company?.slug || `${slugify(cleanName)}-${Date.now()}`,
      website: normalizedWebsite,
      description: description.trim(),
      updated_at: now,
    };

    try {
      if (isEdit && company) {
        await updateRecord("companies", company.id, payload);
        router.push(`/companies/${company.id}`);
        router.refresh();
        return;
      }

      const record = await createRecord<RawPocketBaseRecord>("companies", {
        ...payload,
        created_at: now,
        ...(auth?.user.id ? { created_by: auth.user.id } : {}),
      });

      router.push(`/companies/${record.id}`);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : `Unable to ${isEdit ? "update" : "create"} company.`
      );
      setSaving(false);
    }
  }

  return (
    <section className="surface-panel overflow-hidden rounded-2xl">
      <div className="relative border-b border-slate-800 bg-slate-900/40 px-5 py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-300/0 via-orange-300/45 to-sky-300/0" />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-orange-500 text-white shadow-lg shadow-sky-950/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                Client Workspace
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                {isEdit ? "Edit Company" : "New Company"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isEdit
                  ? "Update client details used across KB articles and assets."
                  : "Create a client workspace for related documentation and assets."}
              </p>
            </div>
          </div>

          {isEdit && company?.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-orange-500/50 hover:text-orange-200"
            >
              <ExternalLink className="h-4 w-4" />
              Open website
            </a>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Company name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Braille House"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="example.com"
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70"
            />
            {website.trim() && normalizedWebsite !== website.trim() && (
              <p className="mt-2 text-xs text-slate-500">
                Will save as {normalizedWebsite}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              placeholder="Short client notes, support context, scope, or internal reminders."
              className="w-full resize-y rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save changes"
                  : "Create company"}
            </button>
            <Link
              href={company ? `/companies/${company.id}` : "/companies"}
              className="inline-flex h-10 items-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client Preview
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-orange-500 text-lg font-black text-white">
                {(name || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {name || "Company name"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {normalizedWebsite || "No website yet"}
                </p>
              </div>
            </div>
            <p className="mt-4 line-clamp-5 text-sm leading-6 text-slate-400">
              {description || "Add a short description so the client workspace has useful context at a glance."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-semibold text-white">Tip</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Company records connect client KBs and assets. Keeping the website
              and description current makes search and client pages easier to scan.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
}
