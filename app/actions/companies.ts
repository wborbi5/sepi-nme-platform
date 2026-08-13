"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(1, "It needs a name.").max(80),
  oneLiner: z
    .string()
    .trim()
    .min(1, "One line. What is it?")
    .max(50, "50 characters. If it does not fit, it is not one line yet."),
});

export type CompanyResult =
  | { ok: true; slug: string; id: string }
  | { ok: false; error: string };

/**
 * Slugs are generated once, here, and never change — they are in URLs and in
 * every notification link. A collision gets a numeric suffix rather than a
 * rename later.
 */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "company"
  );
}

export async function createCompany(input: unknown): Promise<CompanyResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that form." };
  }

  const supabase = await createClient();
  const base = slugify(parsed.data.name);

  const { data: taken } = await supabase
    .from("companies")
    .select("slug")
    .like("slug", `${base}%`);

  const existing = new Set(((taken ?? []) as { slug: string }[]).map((r) => r.slug));
  let slug = base;
  let n = 1;
  while (existing.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      slug,
      name: parsed.data.name,
      one_liner: parsed.data.oneLiner,
      created_by: profile.id,
    })
    .select("id, slug")
    .single();

  if (error || !company) {
    return { ok: false, error: error?.message ?? "Could not create that." };
  }

  // The creator is on the cap table. Without this row they cannot edit their
  // own company, because every policy keys off company_members.
  await supabase.from("company_members").insert({
    company_id: company.id,
    profile_id: profile.id,
    role: "Founder",
  });

  revalidatePath("/directory");
  revalidatePath("/", "layout");
  return { ok: true, slug: company.slug, id: company.id };
}

/* ------------------------------------------------------- the application */

const draftSchema = z.object({
  companyId: z.string().uuid(),
  passNumber: z.coerce.number().int().min(1).max(3),
  answers: z.record(z.string(), z.string().max(4000)),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Autosave. Nobody loses a 400-character answer to a dropped connection. */
export async function saveApplicationDraft(input: unknown): Promise<SaveResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Could not save that." };

  const supabase = await createClient();
  const { error } = await supabase.from("application_drafts").upsert(
    {
      company_id: parsed.data.companyId,
      pass_number: parsed.data.passNumber,
      answers: parsed.data.answers,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,pass_number" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Submit a pass. Passes are separate rows and are never overwritten — the
 * unique constraint on (company_id, pass_number) is what enforces that.
 */
export async function submitApplication(input: unknown): Promise<SaveResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Not signed in." };

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something did not fit." };

  const { companyId, passNumber, answers } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("applications").insert({
    company_id: companyId,
    pass_number: passNumber,
    answers,
    is_current: true,
  });

  if (error) {
    return {
      ok: false,
      error: /duplicate|unique/i.test(error.message)
        ? "That pass is already submitted. Passes are a record, not a draft."
        : error.message,
    };
  }

  // Section 1 answers are the company's own columns — keep them in sync.
  const patch: Record<string, string> = {};
  if (answers.company_name?.trim()) patch.name = answers.company_name.trim();
  if (answers.one_liner?.trim()) patch.one_liner = answers.one_liner.trim().slice(0, 50);
  if (Object.keys(patch).length > 0) {
    await supabase.from("companies").update(patch).eq("id", companyId);
  }

  await supabase
    .from("application_drafts")
    .delete()
    .eq("company_id", companyId)
    .eq("pass_number", passNumber);

  revalidatePath("/", "layout");
  return { ok: true };
}
