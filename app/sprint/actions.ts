"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/*
 * Sprint entry submission. RLS (sprint_entries_submit) restricts inserts
 * to your own profile_id while the event is open; proof photos went
 * browser → Storage already, we only store the path.
 */

const schema = z.object({
  event_id: z.string().uuid(),
  amount_delivered: z.coerce.number().int().min(0),
  amount_pre_service: z.coerce.number().int().min(0),
  description: z.string().trim().max(500).optional(),
  proof_path: z.string().optional(),
});

export async function submitSprintEntry(formData: FormData): Promise<void> {
  const parsed = schema.parse(Object.fromEntries(formData.entries()));
  if (parsed.amount_delivered === 0 && parsed.amount_pre_service === 0)
    throw new Error("Enter at least one non-zero amount");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("sprint_entries").insert({
    event_id: parsed.event_id,
    profile_id: user.id,
    amount_delivered: parsed.amount_delivered,
    amount_pre_service: parsed.amount_pre_service,
    description: parsed.description || null,
    proof_path: parsed.proof_path || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/sprint");
}
