"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

const investSchema = z.object({
  companyId: z.string().uuid(),
  amount: z.coerce.number().int(),
  note: z.string().trim().min(1, "Write why. That is the whole point."),
  commitmentTypes: z.array(z.string().max(40)).max(6).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Thin wrapper. Every rule — caps, budget, window, self-investment, one per
 * company, role — is enforced inside `place_investment()` in one transaction.
 * Nothing is re-checked here, because a second copy of a rule is a second
 * chance to get it wrong.
 */
export async function placeInvestment(input: unknown): Promise<ActionResult> {
  const parsed = investSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check that form." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_investment", {
    target_company: parsed.data.companyId,
    invest_amount: parsed.data.amount,
    invest_note: parsed.data.note,
    types: parsed.data.commitmentTypes ?? [],
  });

  if (error) return { ok: false, error: error.message };

  // Email never blocks the action. The money is already committed.
  try {
    const { data: company } = await supabase
      .from("companies")
      .select("name, slug, created_by")
      .eq("id", parsed.data.companyId)
      .single();

    const { data: founders } = await supabase
      .from("company_members")
      .select("profiles(id, email, full_name)")
      .eq("company_id", parsed.data.companyId);

    const investor = await getProfile();

    for (const row of (founders ?? []) as unknown as {
      profiles: { id: string; email: string; full_name: string | null } | null;
    }[]) {
      if (!row.profiles) continue;
      await sendEmail({
        to: row.profiles.email,
        recipientId: row.profiles.id,
        type: "investment_received",
        dedupeKey: `received:${(data as { id?: string } | null)?.id ?? crypto.randomUUID()}:${row.profiles.id}`,
        subject: `${investor?.full_name ?? "A member"} backed ${company?.name}`,
        heading: `$${parsed.data.amount.toLocaleString("en-US")} into ${company?.name}`,
        lines: [
          `${investor?.full_name ?? "A member"} committed $${parsed.data.amount.toLocaleString("en-US")}.`,
          `"${parsed.data.note}"`,
          "You have 72 hours to accept or decline. After that it accepts automatically.",
        ],
        ctaLabel: "Respond",
        ctaPath: `/c/${company?.slug}`,
      });
    }
  } catch {
    // Logged inside sendEmail. An unreachable Resend does not undo an investment.
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const respondSchema = z.object({
  investmentId: z.string().uuid(),
  status: z.enum(["accepted", "declined"]),
});

/** Founder-side. Investors have no path to reverse their own commitment. */
export async function respondToInvestment(input: unknown): Promise<ActionResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_investment", {
    investment: parsed.data.investmentId,
    new_status: parsed.data.status,
  });

  if (error) return { ok: false, error: error.message };

  if (parsed.data.status === "declined") {
    try {
      const { data: inv } = await supabase
        .from("investments")
        .select("amount, investor:profiles!investments_investor_id_fkey(id, email, full_name), company:companies(name)")
        .eq("id", parsed.data.investmentId)
        .single();

      const row = inv as unknown as {
        amount: number;
        investor: { id: string; email: string; full_name: string | null } | null;
        company: { name: string } | null;
      } | null;

      if (row?.investor) {
        await sendEmail({
          to: row.investor.email,
          recipientId: row.investor.id,
          type: "investment_declined",
          dedupeKey: `declined:${parsed.data.investmentId}`,
          subject: `${row.company?.name} declined your investment`,
          heading: "Funds returned",
          lines: [
            `${row.company?.name} declined your $${row.amount.toLocaleString("en-US")} commitment.`,
            "That money is back in your available balance.",
          ],
          ctaLabel: "See your portfolio",
          ctaPath: "/portfolio",
        });
      }
    } catch {
      // Same rule. Email is never the reason a decision fails.
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
