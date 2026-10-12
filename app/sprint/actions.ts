"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/*
 * Sprint entry submission. RLS (sprint_entries_submit) restricts inserts
 * to your own profile_id while the event is open; proof photos went
 * browser → Storage already, we only store the path.
 */

const PROOF_MESSAGE = "Add a proof photo before submitting.";

const schema = z.object({
  event_id: z.string().uuid(),
  amount_delivered: z.coerce.number().int().min(0),
  amount_pre_service: z.coerce.number().int().min(0),
  description: z.string().trim().max(500).optional(),
  proof_path: z.string().trim().min(1, PROOF_MESSAGE),
});

export async function submitSprintEntry(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = Object.fromEntries(formData.entries());
  const proof = typeof raw.proof_path === "string" ? raw.proof_path.trim() : "";
  if (!proof) return { ok: false, error: PROOF_MESSAGE };

  const parsedResult = schema.safeParse(raw);
  if (!parsedResult.success) {
    const proofIssue = parsedResult.error.issues.some((issue) => issue.path[0] === "proof_path");
    if (proofIssue) return { ok: false, error: PROOF_MESSAGE };
    return {
      ok: false,
      error: parsedResult.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const parsed = parsedResult.data;
  if (parsed.amount_delivered === 0 && parsed.amount_pre_service === 0)
    throw new Error("Enter at least one non-zero amount");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // The sprint is audience-gated: current-member sprints take entries
  // from current members (and admins), new-member sprints from new
  // members. Your roster assignment rides along on the entry.
  const [{ data: event }, { data: me }, { data: roster }] = await Promise.all([
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
  if (!event) throw new Error("Sprint not found");
  if (event.status !== "open") throw new Error("This sprint is not open");
  const myAudience = me?.role === "new_member" ? "new_member" : "current_member";
  if (event.audience !== myAudience)
    throw new Error(
      event.audience === "current_member"
        ? "This sprint is for current members"
        : "This sprint is for new members"
    );

  const { error } = await supabase.from("sprint_entries").insert({
    event_id: parsed.event_id,
    profile_id: user.id,
    amount_delivered: parsed.amount_delivered,
    amount_pre_service: parsed.amount_pre_service,
    description: parsed.description || null,
    proof_path: parsed.proof_path,
    team: roster?.team ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sprint");
  return { ok: true };
}
