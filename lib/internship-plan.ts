import { z } from "zod";

/*
 * Summer 2027 internship pipeline. The goal itself is profiles.summer_27_plan
 * (migration 0015). Everything else is internship_plans, one row per member.
 * Client and the server action share this schema.
 */

export const SUMMER_GOALS = [
  { value: "internship", label: "Internship" },
  { value: "build_business", label: "Build a business" },
  { value: "free_ball", label: "Free ball" },
  { value: "other", label: "Other" },
] as const;

export const COMPANY_SIZES = [
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
  { value: "either", label: "Either" },
  { value: "unsure", label: "Unsure" },
] as const;

export const SUMMER_END_GOALS = [
  { value: "experience", label: "Experience" },
  { value: "connections", label: "Connections" },
  { value: "name_brand", label: "Name brand" },
  { value: "skills", label: "Skills" },
] as const;

export const HELP_WANTED = [
  { value: "interview_prep", label: "Interview prep" },
  { value: "approach_session", label: "Approach session" },
  { value: "resume", label: "Resume" },
  { value: "networking", label: "Networking" },
  { value: "tutoring", label: "Tutoring" },
  { value: "other", label: "Other" },
] as const;

export type SummerGoal = (typeof SUMMER_GOALS)[number]["value"];
export type CompanySize = (typeof COMPANY_SIZES)[number]["value"];
export type SummerEndGoal = (typeof SUMMER_END_GOALS)[number]["value"];
export type HelpWanted = (typeof HELP_WANTED)[number]["value"];

const END_GOAL_VALUES = SUMMER_END_GOALS.map((item) => item.value);
const HELP_VALUES = HELP_WANTED.map((item) => item.value);

export type InternshipPlanFormValue = {
  summer_27_plan: SummerGoal | null;
  summer_27_plan_other: string | null;
  preferred_location: string | null;
  job_type: string | null;
  company_size: CompanySize | null;
  summer_end_goals: SummerEndGoal[];
  brand_strengths: string | null;
  gaps: string | null;
  help_wanted: HelpWanted[];
  notes: string | null;
};

export const EMPTY_INTERNSHIP_PLAN: InternshipPlanFormValue = {
  summer_27_plan: null,
  summer_27_plan_other: null,
  preferred_location: null,
  job_type: null,
  company_size: null,
  summer_end_goals: [],
  brand_strengths: null,
  gaps: null,
  help_wanted: [],
  notes: null,
};

function optionalText(max: number, message: string) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(max, message).transform((value) => value || null)
  );
}

function choiceList<T extends string>(allowed: readonly T[], label: string) {
  const known = new Set<string>(allowed);
  return z.preprocess(
    (value) => {
      if (value == null || value === "") return [];
      const list = Array.isArray(value) ? value : [value];
      return list
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    },
    z.array(z.string()).transform((items, ctx) => {
      const unique: T[] = [];
      for (const item of items) {
        if (!known.has(item)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} has an option that is not on the list.`,
          });
          return z.NEVER;
        }
        if (!unique.includes(item as T)) unique.push(item as T);
      }
      return unique;
    })
  );
}

export const internshipPlanSchema = z.object({
  summer_27_plan: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(["", "internship", "build_business", "free_ball", "other"], {
        errorMap: () => ({
          message:
            "Summer plan should be internship, build a business, free ball, other, or blank.",
        }),
      })
      .transform((value) => value || null)
  ),
  summer_27_plan_other: optionalText(500, "Summer plan note must be 500 characters or fewer."),
  preferred_location: optionalText(200, "Location must be 200 characters or fewer."),
  job_type: optionalText(200, "Role interest must be 200 characters or fewer."),
  company_size: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(["", "small", "large", "either", "unsure"], {
        errorMap: () => ({
          message: "Company size should be small, large, either, unsure, or blank.",
        }),
      })
      .transform((value) => value || null)
  ),
  summer_end_goals: choiceList(END_GOAL_VALUES, "End of summer"),
  brand_strengths: optionalText(1000, "Strengths must be 1,000 characters or fewer."),
  gaps: optionalText(1000, "Gaps must be 1,000 characters or fewer."),
  help_wanted: choiceList(HELP_VALUES, "Help wanted"),
  notes: optionalText(2000, "Notes must be 2,000 characters or fewer."),
});

export function formDataToRecord(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    const current = raw[key];
    if (current === undefined) raw[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else raw[key] = [current, value];
  }
  return raw;
}

export function parseInternshipPlan(
  raw: Record<string, unknown>
): { ok: true; value: InternshipPlanFormValue } | { ok: false; error: string } {
  const parsed = internshipPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const data = parsed.data;
  return {
    ok: true,
    value: {
      summer_27_plan: data.summer_27_plan,
      summer_27_plan_other:
        data.summer_27_plan === "other" ? data.summer_27_plan_other : null,
      preferred_location: data.preferred_location,
      job_type: data.job_type,
      company_size: data.company_size,
      summer_end_goals: data.summer_end_goals,
      brand_strengths: data.brand_strengths,
      gaps: data.gaps,
      help_wanted: data.help_wanted,
      notes: data.notes,
    },
  };
}
