import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";
import { getRecords } from "@/lib/pocketbase/server";
import { requireUser } from "@/lib/auth";
import type { Company } from "@/types/database";

type CompanyRow = Company;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q = "" } = await searchParams;

  let companies: CompanyRow[] = [];

  try {
    const { items } = await getRecords<CompanyRow>("companies", {
      sort: "name",
    });
    companies = items;
  } catch {
    companies = [];
  }

  const query = q.trim().toLowerCase();
  const filteredCompanies = companies.filter((company) => {
    if (!query) return true;
    return (
      company.name.toLowerCase().includes(query) ||
      (company.website || "").toLowerCase().includes(query) ||
      (company.description || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <section className="rounded border border-slate-800 bg-slate-950/80">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
              Clients
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Companies
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Organize documentation and assets by customer or internal entity.
            </p>
          </div>

          <Link
            href="/companies/new"
            className="inline-flex h-9 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" />
            New Company
          </Link>
        </div>

        <form className="border-b border-slate-800 p-4">
          <label className="flex h-10 max-w-2xl items-center gap-2 rounded border border-slate-800 bg-slate-900/70 px-3 text-white focus-within:border-orange-500/70">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search companies, websites, notes..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </label>
        </form>

        {filteredCompanies.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-400">
            No companies found.
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="group rounded border border-slate-800 bg-slate-900/35 p-4 transition hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-slate-900/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">
                      {company.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {company.website || "No website"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                  {company.description || "No description yet."}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
