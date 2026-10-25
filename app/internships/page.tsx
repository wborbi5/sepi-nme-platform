import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import InternshipPlanForm from "@/components/InternshipPlanForm";
import { getNavSession } from "@/lib/data";
import {
  EMPTY_INTERNSHIP_PLAN,
  type CompanySize,
  type HelpWanted,
  type InternshipPlanFormValue,
  type SummerEndGoal,
  type SummerGoal,
} from "@/lib/internship-plan";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Internship Pipeline — SEPi Portal" };

const OPPORTUNITIES = [
  { title: "Speaker mentorship" },
  { title: "Hackathons" },
  { title: "Startup Weekend", detail: "Nov 20–22" },
  { title: "Interview, resume, and approach sessions" },
];

const CONTACTS = [
  { name: "Aaron Verstraete", href: "https://www.linkedin.com/in/averstraete/" },
  { name: "Kaya Hickin", href: "https://www.linkedin.com/in/kayahickin/" },
  { name: "Giancarlo Sarti", href: "https://www.linkedin.com/in/giancarlo-sarti/" },
];

const SUMMER_GOAL_SET = new Set<string>([
  "internship",
  "build_business",
  "free_ball",
  "other",
]);
const COMPANY_SIZE_SET = new Set<string>(["small", "large", "either", "unsure"]);
const END_GOAL_SET = new Set<string>(["experience", "connections", "name_brand", "skills"]);
const HELP_SET = new Set<string>([
  "interview_prep",
  "approach_session",
  "resume",
  "networking",
  "tutoring",
  "other",
]);

function asEnum<T extends string>(value: unknown, allowed: Set<string>): T | null {
  return typeof value === "string" && allowed.has(value) ? (value as T) : null;
}

function asEnumList<T extends string>(value: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(value)) return [];
  const unique: T[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item) && !unique.includes(item as T)) {
      unique.push(item as T);
    }
  }
  return unique;
}

export default async function InternshipsPage() {
  const nav = await getNavSession();
  let plan = EMPTY_INTERNSHIP_PLAN;
  let loadError = "";

  if (supabaseConfigured() && nav.userId) {
    const supabase = await createClient();
    const [profileRes, planRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("summer_27_plan, summer_27_plan_other")
        .eq("id", nav.userId)
        .maybeSingle(),
      supabase
        .from("internship_plans")
        .select(
          "preferred_location, job_type, company_size, summer_end_goals, brand_strengths, gaps, help_wanted, notes"
        )
        .eq("profile_id", nav.userId)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const row = planRes.data;
    plan = {
      summer_27_plan: asEnum<SummerGoal>(profile?.summer_27_plan, SUMMER_GOAL_SET),
      summer_27_plan_other:
        typeof profile?.summer_27_plan_other === "string" ? profile.summer_27_plan_other : null,
      preferred_location:
        typeof row?.preferred_location === "string" ? row.preferred_location : null,
      job_type: typeof row?.job_type === "string" ? row.job_type : null,
      company_size: asEnum<CompanySize>(row?.company_size, COMPANY_SIZE_SET),
      summer_end_goals: asEnumList<SummerEndGoal>(row?.summer_end_goals, END_GOAL_SET),
      brand_strengths: typeof row?.brand_strengths === "string" ? row.brand_strengths : null,
      gaps: typeof row?.gaps === "string" ? row.gaps : null,
      help_wanted: asEnumList<HelpWanted>(row?.help_wanted, HELP_SET),
      notes: typeof row?.notes === "string" ? row.notes : null,
    } satisfies InternshipPlanFormValue;

    if (profileRes.error && /summer_27_plan/.test(profileRes.error.message)) {
      loadError =
        "Summer 2027 plan columns are missing. Apply migration 0015_summer_27_plan.sql in Supabase.";
    } else if (planRes.error && /internship_plans/.test(planRes.error.message)) {
      loadError =
        "The internship plan table is not in the database yet. Apply migration 0016_internship_plans.sql in Supabase before saving.";
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-4 pb-24 sm:px-6">
        <h1 className="display-serif py-10 text-center text-4xl sm:py-14 sm:text-6xl">
          Internship Pipeline
        </h1>
        <p className="text-[17px] leading-7 text-midnight">
          Decide what you want for next summer. SEPi then helps with approach,
          interview prep, and networking.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-steel">
            Next few weeks
          </h2>
          <ul className="mt-2">
            {OPPORTUNITIES.map((item) => (
              <li
                key={item.title}
                className="flex min-h-[44px] items-center justify-between gap-3 border-t border-stone py-2"
              >
                <span className="text-base font-bold text-midnight">{item.title}</span>
                {"detail" in item && item.detail ? (
                  <span className="shrink-0 text-sm font-semibold text-steel">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-steel">
            Your plan
          </h2>
          {loadError ? (
            <p className="mt-3 text-sm font-semibold text-[#b45309]" role="status">
              {loadError}
            </p>
          ) : null}
          {!nav.userId ? (
            <p className="mt-3 text-[15px] leading-6 text-slate-blue">
              <Link href="/login?next=/internships" className="font-bold text-oxford">
                Sign in
              </Link>{" "}
              to save this.
            </p>
          ) : null}
          <InternshipPlanForm plan={plan} />
        </section>

        <section className="mt-12">
          <h2 className="text-sm font-bold uppercase tracking-wide text-steel">
            For context
          </h2>
          <ul className="mt-2 space-y-2">
            {CONTACTS.map((person) => (
              <li key={person.href}>
                <a
                  href={person.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center rounded-md border border-stone bg-paper px-4 text-base font-bold text-oxford"
                >
                  {person.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
