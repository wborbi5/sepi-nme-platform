"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createServiceClient,
  requireAdmin,
  serviceRoleConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Admin server actions. Every one of them starts with requireAdmin() —
 * layer 3, non-negotiable — then uses the service client for the write.
 * Actions throw on failure; app/admin/error.tsx renders the message.
 */

// ------------------------------------------------------------------ invites

const inviteSchema = z.object({
  emails: z.string().min(3),
  role: z.enum(["admin", "current_member", "new_member"]),
  pledge_class: z.string().optional(),
});

export async function inviteMembers(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    if (!serviceRoleConfigured())
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

    const parsed = inviteSchema.parse({
      emails: formData.get("emails"),
      role: formData.get("role"),
      pledge_class: formData.get("pledge_class") ?? undefined,
    });

    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "miamioh.edu";
    const emails = parsed.emails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) throw new Error("No emails provided");

    const bad = emails.filter((e) => !e.endsWith(`@${domain}`));
    if (bad.length > 0)
      throw new Error(`Not @${domain}: ${bad.join(", ")}`);

    const service = createServiceClient();
    const failures: string[] = [];
    for (const email of emails) {
      const { error } = await service.auth.admin.inviteUserByEmail(email, {
        data: { role: parsed.role, pledge_class: parsed.pledge_class ?? null },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });
      if (error) failures.push(`${email}: ${error.message}`);
    }
    if (failures.length > 0)
      throw new Error(`Some invites failed — ${failures.join(" · ")}`);

    revalidatePath("/admin/members");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

// ------------------------------------------------------------------ members

export async function updateMember(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    const id = z.string().uuid().parse(formData.get("id"));
    const patch: Record<string, unknown> = {};

    const role = formData.get("role");
    if (role) patch.role = z.enum(["admin", "current_member", "new_member"]).parse(role);

    const big = formData.get("big_id");
    if (big !== null) patch.big_id = big === "" ? null : z.string().uuid().parse(big);

    const pledge = formData.get("pledge_class");
    if (pledge !== null) patch.pledge_class = String(pledge) || null;

    const position = formData.get("position");
    if (position !== null) patch.position = String(position) || null;

    const active = formData.get("is_active");
    if (active !== null) patch.is_active = active === "true";

    // Session client on purpose: the profiles privilege-guard trigger
    // checks is_admin() via auth.uid(), which the service role doesn't
    // have. The admin RLS policy authorizes this write as the admin.
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/members");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

// ---------------------------------------------------------------- companies

export async function updateCompany(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    const id = z.string().uuid().parse(formData.get("id"));
    const patch: Record<string, unknown> = {};

    const investable = formData.get("investable");
    if (investable !== null) patch.investable = investable === "true";

    const status = formData.get("status");
    if (status) patch.status = z.enum(["active", "pivoted", "killed"]).parse(status);

    const industry = formData.get("industry");
    if (industry !== null) patch.industry = String(industry) || null;

    const founded = formData.get("founded_year");
    if (founded !== null && founded !== "")
      patch.founded_year = z.coerce.number().int().min(2000).max(2100).parse(founded);

    const service = createServiceClient();
    const { error } = await service.from("companies").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/companies");
    revalidatePath("/companies");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

// -------------------------------------------------------------- investments

export async function resolveInvestment(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    const id = z.string().uuid().parse(formData.get("id"));
    const decision = z.enum(["accepted", "declined"]).parse(formData.get("decision"));

    // Session client on purpose: respond_to_investment() allows admins and
    // writes the investor notification. The rules stay in Postgres.
    const supabase = await createClient();
    const { error } = await supabase.rpc("respond_to_investment", {
      investment: id,
      new_status: decision,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/investments");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

export async function voidInvestment(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    const id = z.string().uuid().parse(formData.get("id"));

    const service = createServiceClient();
    const { error } = await service.from("investments").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/investments");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

// ----------------------------------------------------------------- settings

export async function updateSettings(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    const patch = {
      investment_window_open: formData.get("investment_window_open") === "true",
      investment_min: z.coerce.number().int().positive().parse(formData.get("investment_min")),
      investment_max: z.coerce.number().int().positive().parse(formData.get("investment_max")),
      investor_budget: z.coerce.number().int().positive().parse(formData.get("investor_budget")),
    };

    const service = createServiceClient();
    const { error } = await service.from("app_settings").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings");
  } catch (err) {
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}
