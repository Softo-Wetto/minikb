import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompanyForm from "@/components/company-form";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/roles";
import { getRecord } from "@/lib/pocketbase/server";
import type { Company } from "@/types/database";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();
  const { id } = await params;

  if (!canEdit(profile.role)) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-slate-300">
        You do not have permission to edit company details.
      </div>
    );
  }

  let company: Company | null = null;

  try {
    company = await getRecord<Company>("companies", id);
  } catch {
    company = null;
  }

  if (!company) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-slate-300">
        Company not found.
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-4">
      <Link
        href={`/companies/${company.id}`}
        className="group inline-flex h-9 items-center gap-2 rounded border border-slate-800 bg-slate-950/70 px-3 text-sm font-medium text-slate-300 shadow-sm transition hover:border-orange-500/45 hover:bg-slate-900 hover:text-orange-200"
      >
        <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
        Back to {company.name}
      </Link>

      <CompanyForm mode="edit" company={company} />
    </div>
  );
}
