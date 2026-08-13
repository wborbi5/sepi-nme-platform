"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  assignmentId: z.string().uuid(),
  body: z.string().trim().max(4000).optional(),
  url: z
    .union([z.string().trim().url("That is not a valid link."), z.literal("")])
    .optional(),
  filePath: z.string().trim().max(300).optional(),
});

export type SubmitResult = { ok: true } | { ok: false; error: string };

/**
 * Turning something in. Upsert rather than insert so a returned assignment can
 * be redone in place — the to-do function keys off the same row.
 */
export async function submitAssignment(input: unknown): Promise<SubmitResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that form." };
  }

  const { assignmentId, body, url, filePath } = parsed.data;

  if (!body?.trim() && !url && !filePath) {
    return { ok: false, error: "Put something in before you turn it in." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("assignment_submissions").upsert(
    {
      assignment_id: assignmentId,
      profile_id: profile.id,
      body: body?.trim() || null,
      url: url || null,
      file_path: filePath || null,
      // A redo goes back to submitted; only an admin moves it to approved.
      status: "submitted",
      feedback: null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,profile_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/todo");
  revalidatePath("/", "layout");
  return { ok: true };
}
