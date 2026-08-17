"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EmailType } from "@/lib/email";

const TYPES: EmailType[] = [
  "investment_received",
  "investment_declined",
  "response_reminder",
  "sprint_rejected",
  "weekly_digest",
];

/* Per-type opt-outs into profiles.email_prefs. Absent key = opted in. */
export async function updateEmailPrefs(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const prefs: Record<string, boolean> = {};
  for (const t of TYPES) {
    if (formData.get(t) !== "on") prefs[t] = false; // only store opt-outs
  }

  const { error } = await supabase
    .from("profiles")
    .update({ email_prefs: prefs })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/notifications");
}
