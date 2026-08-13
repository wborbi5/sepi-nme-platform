"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Layer 3 of 3. Every action here starts with assertAdmin(), which re-reads the
 * role from the database. Middleware and RLS already checked; all three are
 * real, and none of them is a formality.
 */

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

/* ------------------------------------------------------------- allowlist */

const domain = () => process.env.ALLOWED_EMAIL_DOMAIN ?? "miamioh.edu";

const allowSchema = z.object({
  emails: z.string().trim().min(1, "Paste at least one email."),
  role: z.enum(["admin", "current_member", "new_member"]),
});

export async function addToAllowlist(input: unknown): Promise<AdminResult> {
  const admin = await assertAdmin();

  const parsed = allowSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that list." };
  }

  const candidates = [
    ...new Set(
      parsed.data.emails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  // Domain restriction lives here, not at login. The allowlist is the single
  // authority on who gets in; this just stops a typo from opening the door.
  const allowed = domain();
  const wrongDomain = candidates.filter((e) => !e.endsWith(`@${allowed}`));
  const valid = candidates.filter(
    (e) => e.endsWith(`@${allowed}`) && /^[^@\s]+@[^@\s]+$/.test(e),
  );

  if (valid.length === 0) {
    return { ok: false, error: `No valid @${allowed} addresses in that list.` };
  }

  const client = createAdminClient();
  const { error } = await client.from("allowed_emails").upsert(
    valid.map((email) => ({ email, role: parsed.data.role, added_by: admin.id })),
    { onConflict: "email" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/members");
  return {
    ok: true,
    message: wrongDomain.length
      ? `Added ${valid.length}. Skipped ${wrongDomain.length} outside @${allowed}.`
      : `Added ${valid.length}.`,
  };
}

export async function removeFromAllowlist(email: unknown): Promise<AdminResult> {
  await assertAdmin();
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Bad email." };

  const client = createAdminClient();
  const { error } = await client.from("allowed_emails").delete().eq("email", parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/members");
  return { ok: true };
}

const roleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["admin", "current_member", "new_member"]),
});

export async function setMemberRole(input: unknown): Promise<AdminResult> {
  await assertAdmin();
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}

/* ----------------------------------------------------------------- posts */

const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "A post needs a title.").max(140),
  body: z.string().trim().max(8000),
  kind: z.enum(["announcement", "alert", "assignment", "form", "sprint", "session", "update"]),
  audience: z.enum(["all", "new_member", "current_member"]),
  pinned: z.boolean(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaHref: z.string().trim().max(300).optional(),
  eventAt: z.string().trim().optional(),
  location: z.string().trim().max(120).optional(),
});

export async function upsertPost(input: unknown): Promise<AdminResult> {
  const admin = await assertAdmin();

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that form." };
  }

  const d = parsed.data;
  const row = {
    author_id: admin.id,
    // Null company_id is what makes this a chapter-wide feed post rather than a
    // company update. The RLS policy keys off exactly this.
    company_id: null,
    title: d.title,
    body: d.body,
    kind: d.kind,
    audience: d.audience,
    pinned: d.pinned,
    cta_label: d.ctaLabel || null,
    cta_href: d.ctaHref || null,
    event_at: d.eventAt ? new Date(d.eventAt).toISOString() : null,
    location: d.location || null,
  };

  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("posts").update(row).eq("id", d.id)
    : await supabase.from("posts").insert(row);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { ok: true };
}

export async function deletePost(id: unknown): Promise<AdminResult> {
  await assertAdmin();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { ok: true };
}

/* ----------------------------------------------------------- assignments */

const assignmentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Give it a title.").max(140),
  detail: z.string().trim().max(4000).optional(),
  weekNumber: z.coerce.number().int().min(1).max(7).optional(),
  audience: z.enum(["all", "new_member", "current_member"]),
  dueAt: z.string().trim().optional(),
  submitKind: z.enum(["text", "link", "file", "external", "none"]),
  submitHref: z.string().trim().max(300).optional(),
  submitHint: z.string().trim().max(300).optional(),
  isPublished: z.boolean(),
});

export async function upsertAssignment(input: unknown): Promise<AdminResult> {
  const admin = await assertAdmin();

  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that form." };
  }

  const d = parsed.data;
  const row = {
    title: d.title,
    detail: d.detail || null,
    week_number: d.weekNumber ?? null,
    audience: d.audience,
    due_at: d.dueAt ? new Date(d.dueAt).toISOString() : null,
    submit_kind: d.submitKind,
    submit_href: d.submitHref || null,
    submit_hint: d.submitHint || null,
    is_published: d.isPublished,
    created_by: admin.id,
  };

  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("assignments").update(row).eq("id", d.id)
    : await supabase.from("assignments").insert(row);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/assignments");
  revalidatePath("/todo");
  return { ok: true };
}

const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(["approved", "returned"]),
  feedback: z.string().trim().max(500).optional(),
});

export async function reviewSubmission(input: unknown): Promise<AdminResult> {
  await assertAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_submissions")
    .update({ status: parsed.data.status, feedback: parsed.data.feedback || null })
    .eq("id", parsed.data.submissionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/assignments");
  return { ok: true };
}

/* ---------------------------------------------------------------- sprint */

const sprintReviewSchema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(300).optional(),
});

export async function reviewSprintEntry(input: unknown): Promise<AdminResult> {
  await assertAdmin();
  const parsed = sprintReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sprint_entries")
    .update({
      status: parsed.data.status,
      reject_reason: parsed.data.status === "rejected" ? parsed.data.reason || null : null,
    })
    .eq("id", parsed.data.entryId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sprint");
  revalidatePath("/sprint");
  return { ok: true };
}

/* -------------------------------------------------------------- settings */

const settingsSchema = z.object({
  investmentWindowOpen: z.boolean(),
  investmentMin: z.coerce.number().int().min(1000).max(500_000),
  investmentMax: z.coerce.number().int().min(1000).max(500_000),
  investorBudget: z.coerce.number().int().min(10_000).max(5_000_000),
});

export async function updateSettings(input: unknown): Promise<AdminResult> {
  await assertAdmin();

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check those numbers." };
  }
  if (parsed.data.investmentMin > parsed.data.investmentMax) {
    return { ok: false, error: "Minimum cannot exceed the maximum." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      investment_window_open: parsed.data.investmentWindowOpen,
      investment_min: parsed.data.investmentMin,
      investment_max: parsed.data.investmentMax,
      investor_budget: parsed.data.investorBudget,
    })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
