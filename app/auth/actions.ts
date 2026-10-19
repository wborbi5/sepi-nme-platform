"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/login";
import { profileNeedsOnboarding } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Where a finished sign-in should land: onboarding until a name is saved. */
export async function postLoginPath(next: string | null): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login?error=link";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, slug")
    .eq("id", user.id)
    .maybeSingle();

  if (profileNeedsOnboarding(profile)) return "/onboarding";
  return safeNextPath(next);
}
