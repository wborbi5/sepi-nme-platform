/*
 * "Plans for summer 27?" — one choice on the member profile.
 * Stored on profiles.summer_27_plan; free text only when the choice is other.
 */

export const SUMMER_27_PLAN_VALUES = [
  "internship",
  "build_business",
  "free_ball",
  "other",
] as const;

export type Summer27Plan = (typeof SUMMER_27_PLAN_VALUES)[number];

export const SUMMER_27_PLAN_OPTIONS: { value: Summer27Plan; label: string }[] = [
  { value: "internship", label: "Internship" },
  { value: "build_business", label: "Build your business" },
  { value: "free_ball", label: "Free ball" },
  { value: "other", label: "Other" },
];

export function isSummer27Plan(value: string): value is Summer27Plan {
  return (SUMMER_27_PLAN_VALUES as readonly string[]).includes(value);
}

/** Columns written by the profile form. Other text is kept only for Other. */
export function summer27Patch(
  plan: Summer27Plan | "" | null | undefined,
  other: string | null | undefined
): { summer_27_plan: Summer27Plan | null; summer_27_plan_other: string | null } {
  const selected = plan ? plan : null;
  const text = other?.trim() || null;
  return {
    summer_27_plan: selected,
    summer_27_plan_other: selected === "other" ? text : null,
  };
}

/** Profile-page answer. Other shows the member's text when they wrote one. */
export function summer27Answer(
  plan: Summer27Plan | null | undefined,
  other: string | null | undefined
): string | null {
  if (!plan) return null;
  if (plan === "other") {
    const text = other?.trim();
    return text ? text : "Other";
  }
  return SUMMER_27_PLAN_OPTIONS.find((o) => o.value === plan)?.label ?? null;
}
