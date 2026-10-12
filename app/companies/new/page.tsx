import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import CompanyForm from "@/components/CompanyForm";
import { getCofounderCandidates, getNavSession } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "New company — SEPi Portal" };

export default async function NewCompanyPage() {
  if (!supabaseConfigured()) redirect("/");
  const [nav, members] = await Promise.all([getNavSession(), getCofounderCandidates()]);
  if (!nav.userId) redirect("/login?next=/companies/new");

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-5xl">
          Submit your company
        </h1>
        <CompanyForm members={members} selfId={nav.userId} />
      </div>
    </div>
  );
}
