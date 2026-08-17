"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateAnswers } from "@/lib/application-questions";

/*
 * Application writes. RLS (applications_write, application_drafts_own)
 * restricts both tables to the founding team + admins; these actions
 * just relay with the session client so that stays true.
 */

const draftSchema = z.object({
  company_id: z.string().uuid(),
  pass_number: z.coerce.number().int().min(1).max(3),
  answers: z.record(z.string(), z.string()),
});

export async function saveDraft(
  companyId: string,
  passNumber: number,
  answers: Record<string, string>
): Promise<void> {
  const parsed = draftSchema.parse({
    company_id: companyId,
    pass_number: passNumber,
    answers,
  });
  const supabase = await createClient();
  const { error } = await supabase.from("application_drafts").upsert({
    company_id: parsed.company_id,
    pass_number: parsed.pass_number,
    answers: parsed.answers,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function submitApplication(formData: FormData): Promise<void> {
  const companyId = z.string().uuid().parse(formData.get("company_id"));
  const passNumber = z.coerce.number().int().min(1).max(3).parse(formData.get("pass_number"));
  const noVenture = formData.get("no_venture") === "true";
  const answers = draftSchema.shape.answers.parse(
    JSON.parse(String(formData.get("answers_json") ?? "{}"))
  );

  // The escape hatch exists for Pass 1 only.
  if (noVenture && passNumber !== 1)
    throw new Error("The no-venture path is only available on Pass 1");

  const errors = validateAnswers(answers, { noVenture });
  if (errors.length > 0) throw new Error(errors.join(" · "));

  const supabase = await createClient();

  // Passes are never overwritten — one row per pass, forever.
  const { error } = await supabase.from("applications").insert({
    company_id: companyId,
    pass_number: passNumber,
    answers: { ...answers, no_venture: noVenture ? "true" : "" },
  });
  if (error) {
    if (error.code === "23505")
      throw new Error(`Pass ${passNumber} has already been submitted`);
    throw new Error(error.message);
  }

  // Older passes stop being "current".
  await supabase
    .from("applications")
    .update({ is_current: false })
    .eq("company_id", companyId)
    .neq("pass_number", passNumber);

  // Clear the draft now that it's a real pass.
  await supabase
    .from("application_drafts")
    .delete()
    .eq("company_id", companyId)
    .eq("pass_number", passNumber);

  revalidatePath("/companies");
}
