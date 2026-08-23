"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/day";

/*
 * Roll Call mutations. RLS already restricts every write to the caller's
 * own rows, so these actions carry the rules RLS cannot express: the day
 * being written must not be in the past, and a clock-in is today only.
 *
 * Every write is additionally scoped .eq("day", day), so a forged day in
 * the form body matches nothing rather than editing yesterday.
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function requireUser(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user.id;
}

function requireOpenDay(value: string) {
  if (value < today()) throw new Error("Past days are read-only");
}

function requireToday(value: string) {
  if (value !== today()) throw new Error("You can only clock in for today");
}

const addSchema = z.object({ day, text: z.string().trim().min(1).max(140) });

export async function addGoal(formData: FormData): Promise<void> {
  const parsed = addSchema.parse(Object.fromEntries(formData.entries()));
  requireOpenDay(parsed.day);
  const userId = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("daily_goals").insert({
    profile_id: userId,
    day: parsed.day,
    text: parsed.text,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/updates");
}

const toggleSchema = z.object({
  id: z.string().uuid(),
  day,
  done: z.enum(["true", "false"]),
});

export async function toggleGoal(formData: FormData): Promise<void> {
  const parsed = toggleSchema.parse(Object.fromEntries(formData.entries()));
  requireOpenDay(parsed.day);
  const userId = await requireUser();
  const done = parsed.done === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_goals")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", parsed.id)
    .eq("day", parsed.day)
    .eq("profile_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/updates");
}

const removeSchema = z.object({ id: z.string().uuid(), day });

export async function removeGoal(formData: FormData): Promise<void> {
  const parsed = removeSchema.parse(Object.fromEntries(formData.entries()));
  requireOpenDay(parsed.day);
  const userId = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_goals")
    .delete()
    .eq("id", parsed.id)
    .eq("day", parsed.day)
    .eq("profile_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/updates");
}

const clockSchema = z.object({ day });

export async function clockIn(formData: FormData): Promise<void> {
  const parsed = clockSchema.parse(Object.fromEntries(formData.entries()));
  requireToday(parsed.day);
  const userId = await requireUser();

  // Re-clocking in after a clock-out clears the stamp rather than
  // creating a second row — one check-in per member per day.
  const supabase = await createClient();
  const { error } = await supabase.from("checkins").upsert(
    {
      profile_id: userId,
      day: parsed.day,
      clocked_in_at: new Date().toISOString(),
      clocked_out_at: null,
      location: "Elm",
    },
    { onConflict: "profile_id,day" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/updates");
}

export async function clockOut(formData: FormData): Promise<void> {
  const parsed = clockSchema.parse(Object.fromEntries(formData.entries()));
  requireToday(parsed.day);
  const userId = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase
    .from("checkins")
    .update({ clocked_out_at: new Date().toISOString() })
    .eq("profile_id", userId)
    .eq("day", parsed.day);
  if (error) throw new Error(error.message);
  revalidatePath("/updates");
}
