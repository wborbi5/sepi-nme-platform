import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/lib/types";

import { ApplicationForm } from "./application-form";

export const metadata = { title: "Accelerator Application · SEPi NME" };

const PASS_WEEK: Record<number, string> = { 1: "Week 1", 2: "Week 4", 3: "Week 7" };

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ pass?: string }>;
}) {
  const { companyId } = await params;
  const { pass } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  const company = data as Company | null;
  if (!company) notFound();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  // Only the founding team fills this in. Admins read it from the console.
  if (!membership && company.created_by !== profile.id) redirect(`/c/${company.slug}`);

  const [{ data: submitted }, { data: draft }] = await Promise.all([
    supabase.from("applications").select("pass_number").eq("company_id", companyId),
    supabase.from("application_drafts").select("pass_number, answers").eq("company_id", companyId),
  ]);

  const done = new Set(
    ((submitted ?? []) as { pass_number: number }[]).map((r) => r.pass_number),
  );

  const requested = Number(pass) || 0;
  const passNumber =
    requested >= 1 && requested <= 3 && !done.has(requested)
      ? requested
      : ([1, 2, 3].find((n) => !done.has(n)) ?? 0);

  if (passNumber === 0) {
    return (
      <div className="mx-auto max-w-[620px]">
        <Link href={`/c/${company.slug}`} className="text-[13px] text-[var(--color-text-dim)]">
          ← {company.name}
        </Link>
        <h1 className="mt-3 text-[26px] text-[var(--cloud-white)]">All three passes in</h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
          Nothing left to fill out. Everything you wrote is on your company page.
        </p>
      </div>
    );
  }

  const draftAnswers =
    (((draft ?? []) as { pass_number: number; answers: Record<string, string> }[]).find(
      (d) => d.pass_number === passNumber,
    )?.answers ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-[620px]">
      <Link href={`/c/${company.slug}`} className="text-[13px] text-[var(--color-text-dim)]">
        ← {company.name}
      </Link>

      <header className="mt-3 border-b border-[var(--color-border)] pb-5">
        <div className="eyebrow mb-1.5">
          Pass {passNumber} of 3 · {PASS_WEEK[passNumber]}
        </div>
        <h1 className="text-[27px] leading-[1.15] text-[var(--cloud-white)]">
          Accelerator Application
        </h1>

        {/* Three dots beat a paragraph explaining the three passes. */}
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-[3px] flex-1 rounded-full ${
                done.has(n)
                  ? "bg-[var(--color-success)]"
                  : n === passNumber
                    ? "bg-[var(--cloud-white)]"
                    : "bg-[var(--color-border)]"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="mt-7">
        <ApplicationForm
          companyId={company.id}
          passNumber={passNumber}
          companyName={company.name}
          companyOneLiner={company.one_liner}
          initialAnswers={draftAnswers}
        />
      </div>
    </div>
  );
}
