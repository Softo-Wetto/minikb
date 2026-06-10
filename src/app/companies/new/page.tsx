import CompanyForm from "@/components/company-form";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/roles";

export default async function NewCompanyPage() {
  const profile = await requireUser();

  if (!canEdit(profile.role)) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-slate-300">
        You do not have permission to create companies.
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <CompanyForm mode="create" />
    </div>
  );
}
