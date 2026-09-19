"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseResumeForProfile } from "@/lib/resume-parser";
import { slugify } from "@/lib/slug";

/*
 * Self-service profile update. Session client on purpose: RLS only lets
 * you update your own row, and the privilege guard trigger blocks any
 * attempt to change role / big_id / is_active. Avatar and resume bytes
 * go browser → Storage directly; this action only stores the paths.
 */

const schema = z.object({
  full_name: z.string().trim().min(1).max(80),
  major: z.string().trim().max(80).optional(),
  grad_year: z.union([z.coerce.number().int().min(2020).max(2035), z.literal("")]).optional(),
  pledge_class: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(2000).optional(),
  linkedin_url: z
    .union([z.string().trim().url().startsWith("https://"), z.literal("")])
    .optional(),
  skills: z.string().optional(),
  interests: z.string().optional(),
  avatar_path: z.string().optional(),
  resume_path: z.string().optional(),
});

function csvToArray(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string")
  );
  const parsed = schema.parse(raw);

  const patch: Record<string, unknown> = {
    full_name: parsed.full_name,
    major: parsed.major || null,
    grad_year: parsed.grad_year === "" || parsed.grad_year == null ? null : parsed.grad_year,
    pledge_class: parsed.pledge_class || null,
    bio: parsed.bio || null,
    linkedin_url: parsed.linkedin_url || null,
    skills: csvToArray(parsed.skills),
    interests: csvToArray(parsed.interests),
  };
  if (parsed.avatar_path) patch.avatar_path = parsed.avatar_path;
  if (parsed.resume_path) patch.resume_path = parsed.resume_path;

  const { data: existing } = await supabase
    .from("profiles")
    .select("slug")
    .eq("id", user.id)
    .single();
  if (!existing?.slug) {
    patch.slug = slugify(parsed.full_name);
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/people");
  revalidatePath("/settings/profile");
  revalidatePath("/p/[slug]", "page");
  revalidatePath("/onboarding");
}

/*
 * Run LlamaExtract over the caller's own uploaded resume. Synchronous —
 * the form shows "Parsing…" while this waits (typically 10-30s; the
 * page exports maxDuration 60 to cover it).
 */
/* Draft a bio from resume + skills + interests + LinkedIn. Returns the
 * draft for the member to edit — nothing is saved until they hit Save. */
export async function writeMyBio(): Promise<{
  ok: boolean;
  bio?: string;
  message: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, major, grad_year, pledge_class, position, skills, interests, linkedin_url, resume_parsed"
    )
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profile not found");

  const { generateBio } = await import("@/lib/bio-writer");
  return generateBio(profile);
}

export async function parseMyResume(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const result = await parseResumeForProfile(user.id);
  if (result.ok) {
    revalidatePath("/settings/profile");
    revalidatePath("/p/[slug]", "page");
  }
  return result;
}
