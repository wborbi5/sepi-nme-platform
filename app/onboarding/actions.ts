"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { ONBOARDING_FIELDS } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { ENERGY_ORDER } from "@/lib/types";

const chips = z.array(z.string().trim().min(1).max(40)).max(12);
const short = (max: number) => z.string().trim().max(max).nullable().optional();

/**
 * Whitelisted, one field at a time. `role` is not in here — a member picking
 * "current member" tells us their track, not their permissions. The database
 * trigger would reject a role change from a non-admin anyway; this is the layer
 * that means the attempt is never made.
 */
const patchSchema = z
  .object({
    member_track: z.enum(["new", "current"]).nullable().optional(),
    full_name: z.string().trim().min(1, "We need a name.").max(80).optional(),
    pronouns: short(30),
    major: short(60),
    grad_year: z.coerce.number().int().min(2020).max(2035).nullable().optional(),
    hometown: short(80),
    currently: short(240),
    origin: short(400),
    energy: z.enum(ENERGY_ORDER as [string, ...string[]]).nullable().optional(),
    working_style: chips.optional(),
    ask_me_about: chips.optional(),
    need_help_with: chips.optional(),
    headline: short(90),
    superpower: short(160),
    fun_fact: short(160),
  })
  .strict();

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Saves one step. Called on every "next", so a member who closes the tab at
 * step four comes back to step four rather than step one.
 */
export async function saveOnboardingStep(patch: Record<string, unknown>): Promise<SaveResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if ((ONBOARDING_FIELDS as readonly string[]).includes(key)) clean[key] = value;
  }

  const parsed = patchSchema.safeParse(clean);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Something did not fit." };
  }

  // Empty strings become null so "is this filled in" stays a single check.
  const update = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  );

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** The last step. Stamping `onboarded_at` is what stops the middleware redirect. */
export async function finishOnboarding(
  patch: Record<string, unknown>,
): Promise<SaveResult> {
  const saved = await saveOnboardingStep(patch);
  if (!saved.ok) return saved;

  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
