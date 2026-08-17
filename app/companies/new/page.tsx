import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import CompanyForm from "@/components/CompanyForm";
import { getNavSession, getProfiles } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "New company — SEPi Portal" };

export default async function NewCompanyPage() {
  if (!supabaseConfigured()) redirect("/");
  const [nav, profiles] = await Promise.all([getNavSession(), getProfiles()]);
  if (!nav.userId) redirect("/login?next=/companies/new");

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-5xl">
          Submit your company
        </h1>
        <CompanyForm
          members={profiles.map((p) => ({ id: p.id, full_name: p.full_name }))}
          selfId={nav.userId}
        />
      </div>
    </div>
  );
}
