"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  eventId: z.string().uuid(),
  amountDelivered: z.coerce.number().int().min(0).max(1_000_000),
  amountPreService: z.coerce.number().int().min(0).max(1_000_000),
  description: z.string().trim().max(400).optional(),
  proofPath: z.string().trim().max(300).optional(),
});

export type SprintResult = { ok: true } | { ok: false; error: string };

/**
 * Log revenue. Lands as `pending` — only an admin's approval puts it on the
 * board, and the RLS insert policy pins the status so that cannot be skipped.
 */
export async function submitSprintEntry(input: unknown): Promise<SprintResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check those numbers." };
  }

  const { eventId, amountDelivered, amountPreService, description, proofPath } = parsed.data;

  if (amountDelivered === 0 && amountPreService === 0) {
    return { ok: false, error: "Put a number in before you submit." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sprint_entries").insert({
    event_id: eventId,
    profile_id: profile.id,
    amount_delivered: amountDelivered,
    amount_pre_service: amountPreService,
    description: description || null,
    proof_path: proofPath || null,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sprint");
  revalidatePath("/", "layout");
  return { ok: true };
}
