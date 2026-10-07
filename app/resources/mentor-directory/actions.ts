"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseMentorUrl } from "@/lib/mentors";

export async function addMentor(
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to add a mentor." };

  const parsed = parseMentorUrl(String(formData.get("linkedin_url") ?? ""));
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.from("mentors").insert({
    linkedin_url: parsed.mentor.linkedin_url,
    linkedin_slug: parsed.mentor.linkedin_slug,
    display_name: parsed.mentor.display_name,
    added_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already in the directory" };
    return { error: "Could not add that mentor." };
  }

  revalidatePath("/resources/mentor-directory");
  return {};
}
