import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const PROFILE_COLUMNS = `
  id, slug, email, full_name, role, member_track, major, grad_year, pronouns,
  hometown, headline, currently, superpower, origin, fun_fact, ask_me_about,
  need_help_with, working_style, energy, skills, interests, bio, linkedin_url,
  resume_path, avatar_path, big_id, is_active, onboarded_at, created_at
`;

export { PROFILE_COLUMNS };

/**
 * The session's profile, or null. Reads the row from the database every time —
 * never from a cookie, never from client-supplied state.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Signed in and onboarded, or you go somewhere else. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?deactivated=1");
  if (!profile.onboarded_at) redirect("/onboarding");
  return profile;
}

/** Signed in, onboarding not yet required. Used by the onboarding flow itself. */
export async function requireUserProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?deactivated=1");
  return profile;
}

/**
 * Layer 3 of 3. Middleware checked the path and RLS checks every statement;
 * this re-reads the role from the database before any admin write. All three
 * are real — none of them is a formality.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** Same check, for server actions that need to fail loudly rather than redirect. */
export async function assertAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Admins only");
  }
  return profile;
}
