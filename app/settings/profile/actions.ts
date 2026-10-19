"use server";

import { revalidatePath } from "next/cache";
import { optionalHttpUrl } from "@/lib/http-url";
import { parseProfileForm, profileSchema } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";
import { parseResumeForProfile } from "@/lib/resume-parser";
import { slugify } from "@/lib/slug";

/*
 * Self-service profile update. Session client on purpose: RLS only lets
 * you update your own row, and the privilege guard trigger blocks any
 * attempt to change role / big_id / is_active. Avatar and resume bytes
 * go browser → Storage directly; this action only stores the paths.
 *
 * Full name is the only required field. Failures return { ok: false }
 * with a specific message instead of throwing a Zod digest.
 */

export async function updateOwnProfile(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in to save your profile." };

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string")
  );
  const parsedResult = profileSchema.safeParse(raw);
  if (!parsedResult.success) {
    return {
      ok: false,
      error: parsedResult.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const parsed = parseProfileForm(raw);
  if (!parsed.ok) return parsed;

  // Bare domains (linkedin.com/in/x, www.x.com) get https://. Tracking params stay.
  const linkedin = optionalHttpUrl(typeof raw.linkedin_url === "string" ? raw.linkedin_url : "");
  if (!linkedin.ok) {
    return {
      ok: false,
      error:
        "LinkedIn should look like linkedin.com/in/your-name. Tracking parameters are fine, or leave it blank.",
    };
  }

  const patch: Record<string, unknown> = {
    full_name: parsed.value.full_name,
    major: parsed.value.major,
    grad_year: parsed.value.grad_year,
    pledge_class: parsed.value.pledge_class,
    bio: parsed.value.bio,
    linkedin_url: linkedin.value,
    summer_27_plan: parsed.value.summer_27_plan,
    summer_27_plan_other: parsed.value.summer_27_plan_other,
    skills: parsed.value.skills,
    interests: parsed.value.interests,
  };
  if (parsed.value.avatar_path) patch.avatar_path = parsed.value.avatar_path;
  if (parsed.value.resume_path) patch.resume_path = parsed.value.resume_path;

  const { data: existing } = await supabase
    .from("profiles")
    .select("slug")
    .eq("id", user.id)
    .single();
  if (!existing?.slug) {
    patch.slug = slugify(parsed.value.full_name);
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    if (/slug/i.test(error.message) && /unique|duplicate/i.test(error.message)) {
      return {
        ok: false,
        error: "Someone already has a profile link like that name. Add a middle name and save again.",
      };
    }
    return { ok: false, error: "Could not save your profile. Try again." };
  }

  revalidatePath("/people");
  revalidatePath("/settings/profile");
  revalidatePath("/p/[slug]", "page");
  revalidatePath("/onboarding");
  return { ok: true };
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
