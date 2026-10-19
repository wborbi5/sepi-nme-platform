"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sprintEntryError, sprintMoney } from "@/lib/sprint-entry";
import { createClient } from "@/lib/supabase/server";

/*
 * Sprint entry submission. RLS (sprint_entries_submit) restricts inserts
 * to your own profile_id while the event is open; proof files went
 * browser → Storage already, we only store the path.
 *
 * Amounts: strip $ and commas, then z.coerce.number().min(0).multipleOf(0.01).
 * The live columns are already numeric(12,2). Failures return { ok: false }
 * with the real reason instead of throwing.
 */

const schema = z
  .object({
    event_id: z
      .string({
        required_error: "This sprint submission is missing its event. Refresh and try again.",
      })
      .uuid("This sprint submission is missing its event. Refresh and try again."),
    amount_delivered: sprintMoney("Profit"),
    amount_pre_service: sprintMoney("Pre-service"),
    description: z.preprocess(
      (value) => (typeof value === "string" ? value : ""),
      z.string().trim().max(500, "Description must be 500 characters or fewer.")
    ),
    proof_path: z.preprocess(
      (value) => (typeof value === "string" ? value : ""),
      z.string().trim().min(1, "Add a proof photo or PDF before submitting.")
    ),
  })
  .superRefine((value, ctx) => {
    if (value.amount_delivered === 0 && value.amount_pre_service === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an amount greater than zero.",
        path: ["amount_delivered"],
      });
    }
  });

export async function submitSprintEntry(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = Object.fromEntries(formData.entries());
  const parsedResult = schema.safeParse(raw);
  if (!parsedResult.success) {
    return { ok: false, error: sprintEntryError(parsedResult.error) };
  }
  const parsed = parsedResult.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  // The sprint is audience-gated: current-member sprints take entries
  // from current members (and admins), new-member sprints from new
  // members. Your roster assignment rides along on the entry.
  const [{ data: event, error: eventError }, { data: me }, { data: roster }] =
    await Promise.all([
      supabase
        .from("sprint_events")
        .select("audience, status")
        .eq("id", parsed.event_id)
        .single(),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("sprint_rosters")
        .select("team")
        .eq("event_id", parsed.event_id)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);
  if (eventError || !event) {
    return { ok: false, error: eventError?.message || "Sprint not found." };
  }
  if (event.status !== "open") return { ok: false, error: "This sprint is not open." };
  const myAudience = me?.role === "new_member" ? "new_member" : "current_member";
  if (event.audience !== myAudience) {
    return {
      ok: false,
      error:
        event.audience === "current_member"
          ? "This sprint is for current members."
          : "This sprint is for new members.",
    };
  }

  const { error } = await supabase.from("sprint_entries").insert({
    event_id: parsed.event_id,
    profile_id: user.id,
    amount_delivered: parsed.amount_delivered,
    amount_pre_service: parsed.amount_pre_service,
    description: parsed.description || null,
    proof_path: parsed.proof_path,
    team: roster?.team ?? null,
  });
  if (error) {
    console.error("sprint entry insert failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/sprint");
  return { ok: true };
}
