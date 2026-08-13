"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ENERGY_ORDER } from "@/lib/types";

const chips = z.array(z.string().trim().min(1).max(40)).max(12);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/**
 * Everything a member may change about themselves. `role`, `big_id`,
 * `is_active`, and `email` are absent by design — the `guard_profile_privileges`
 * trigger rejects those from a non-admin, and this schema means the attempt is
 * never even made.
 */
const schema = z.object({
  full_name: z.string().trim().min(1, "We need a name.").max(80),
  pronouns: opt(30),
  major: opt(60),
  grad_year: z
    .union([z.coerce.number().int().min(2020).max(2035), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  hometown: opt(80),
  headline: opt(90),
  currently: opt(240),
  superpower: opt(160),
  origin: opt(400),
  fun_fact: opt(160),
  bio: opt(1000),
  linkedin_url: z
    .union([z.string().trim().url("That is not a valid URL."), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  energy: z
    .union([z.enum(ENERGY_ORDER as [string, ...string[]]), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  ask_me_about: chips,
  need_help_with: chips,
  working_style: chips,
  skills: chips,
  interests: chips,
  avatar_path: opt(200),
});

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(input: unknown): Promise<ProfileResult> {
  const me = await getProfile();
  if (!me) return { ok: false, error: "Not signed in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Something did not fit." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
