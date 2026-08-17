import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import ApplicationForm from "@/components/ApplicationForm";
import { getCompanyBySlug, getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Accelerator Application — SEPi Portal" };

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!supabaseConfigured()) redirect("/");
  const { slug } = await params;
  const [company, nav] = await Promise.all([getCompanyBySlug(slug), getNavSession()]);
  if (!company) notFound();
  if (!nav.userId) redirect(`/login?next=/companies/${slug}/apply`);

  const supabase = await createClient();

  // Only the founding team (or an admin) can open the application.
  const { data: membership } = await supabase
    .from("company_members")
    .select("profile_id")
    .eq("company_id", company.id)
    .eq("profile_id", nav.userId)
    .maybeSingle();
  if (!membership && !nav.isAdmin) redirect(`/companies/${slug}`);

  // Current pass = first unsubmitted of 1..3.
  const { data: passes } = await supabase
    .from("applications")
    .select("pass_number, submitted_at")
    .eq("company_id", company.id)
    .order("pass_number");
  const submitted = new Set((passes ?? []).map((p) => p.pass_number));
  const passNumber = [1, 2, 3].find((n) => !submitted.has(n));

  let draft: Record<string, string> = {};
  if (passNumber) {
    const { data } = await supabase
      .from("application_drafts")
      .select("answers")
      .eq("company_id", company.id)
      .eq("pass_number", passNumber)
      .maybeSingle();
    draft = (data?.answers as Record<string, string>) ?? {};
    // Pass 2+ starts from the previous pass's answers when no draft yet.
    if (Object.keys(draft).length === 0 && passNumber > 1) {
      const { data: prev } = await supabase
        .from("applications")
        .select("answers")
        .eq("company_id", company.id)
        .eq("pass_number", passNumber - 1)
        .maybeSingle();
      const prevAnswers = (prev?.answers as Record<string, string>) ?? {};
      delete prevAnswers.no_venture;
      draft = prevAnswers;
    }
    if (!draft.company_name) draft.company_name = company.name;
    if (!draft.one_liner) draft.one_liner = company.one_liner;
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-2xl px-6 pb-24">
        <nav className="py-4 text-sm text-oxford">
          <Link href={`/companies/${slug}`} className="hover:underline">
            ← {company.name}
          </Link>
        </nav>
        <h1 className="display-serif pb-2 pt-6 text-center text-5xl">
          Accelerator Application
        </h1>
        <p className="pb-4 text-center text-steel">
          {company.name} · three passes across the program
          {passNumber ? ` · you're on Pass ${passNumber}` : ""}
        </p>

        {/* pass tracker */}
        <div className="mb-10 flex justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                submitted.has(n)
                  ? "bg-navy text-white"
                  : n === passNumber
                    ? "border border-navy bg-powder text-navy"
                    : "border border-stone bg-paper text-mist"
              }`}
            >
              Pass {n}
            </span>
          ))}
        </div>

        {passNumber ? (
          <ApplicationForm
            companyId={company.id}
            passNumber={passNumber}
            initialAnswers={draft}
          />
        ) : (
          <div className="rounded-xl border border-stone bg-paper p-8 text-center">
            <p className="text-2xl font-extrabold text-midnight">
              All three passes are in.
            </p>
            <p className="mt-3 leading-7 text-slate-blue">
              Every pass is preserved permanently. The latest Section 3
              answers are what shows on the company page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
