"use server";

import { revalidatePath } from "next/cache";
import { formDataToRecord, parseInternshipPlan } from "@/lib/internship-plan";
import { createClient } from "@/lib/supabase/server";

/*
 * Saves the caller's Summer 2027 pulse. The goal stays on profiles so the
 * profile editor and this page share one column. The rest is internship_plans.
 * Session client only — RLS limits the row to auth.uid().
 */

function missingRelation(message: string, name: string) {
  return /does not exist/i.test(message) && message.includes(name);
}

export async function saveInternshipPlan(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in to save your plan." };

  const parsed = parseInternshipPlan(formDataToRecord(formData));
  if (!parsed.ok) return parsed;
  const plan = parsed.value;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      summer_27_plan: plan.summer_27_plan,
      summer_27_plan_other: plan.summer_27_plan_other,
    })
    .eq("id", user.id);

  if (profileError) {
    if (missingRelation(profileError.message, "summer_27_plan")) {
      return {
        ok: false,
        error:
          "Summer 2027 plan columns are missing. Apply migration 0015_summer_27_plan.sql in Supabase, then save again.",
      };
    }
    return { ok: false, error: "Could not save your summer goal. Try again." };
  }

  const { error: planError } = await supabase.from("internship_plans").upsert(
    {
      profile_id: user.id,
      preferred_location: plan.preferred_location,
      job_type: plan.job_type,
      company_size: plan.company_size,
      summer_end_goals: plan.summer_end_goals,
      brand_strengths: plan.brand_strengths,
      gaps: plan.gaps,
      help_wanted: plan.help_wanted,
      notes: plan.notes,
    },
    { onConflict: "profile_id" }
  );

  if (planError) {
    if (missingRelation(planError.message, "internship_plans")) {
      return {
        ok: false,
        error:
          "Your summer goal was saved. The rest of the plan needs migration 0016_internship_plans.sql applied in Supabase.",
      };
    }
    return { ok: false, error: "Could not save the rest of your plan. Try again." };
  }

  revalidatePath("/internships");
  revalidatePath("/settings/profile");
  return { ok: true };
}
