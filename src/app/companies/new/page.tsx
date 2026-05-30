"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { createRecord, getCurrentAuth } from "@/lib/pocketbase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewCompanyPage() {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const auth = getCurrentAuth();

    try {
      await createRecord("companies", {
        name,
        slug: `${slugify(name)}-${Date.now()}`,
        website: website || "",
        description: description || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(auth?.user.id ? { created_by: auth.user.id } : {}),
      });
      window.location.href = "/companies";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create company.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <section className="rounded border border-slate-800 bg-slate-950/80">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
                Companies
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                New Company
              </h1>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="h-10 w-full rounded border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Company"}
            </button>
            <Link
              href="/companies"
              className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
