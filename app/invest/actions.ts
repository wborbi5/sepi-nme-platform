"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

/*
 * The money path. Every rule lives in place_investment() /
 * respond_to_investment() inside Postgres — these actions only relay the
 * session call and then send email, which never blocks the action.
 */

const COMMITMENT_TYPES = ["capital", "mentorship", "intros", "hands-on help"] as const;

const investSchema = z.object({
  company_id: z.string().uuid(),
  amount: z.coerce.number().int(),
  note: z.string().trim().min(1, "A note is required — write why you are investing"),
  types: z.array(z.enum(COMMITMENT_TYPES)).default([]),
});

export async function placeInvestment(formData: FormData): Promise<void> {
  const parsed = investSchema.parse({
    company_id: formData.get("company_id"),
    amount: formData.get("amount"),
    note: formData.get("note"),
    types: formData.getAll("types"),
  });

  const supabase = await createClient();
  const { data: investment, error } = await supabase.rpc("place_investment", {
    target_company: parsed.company_id,
    invest_amount: parsed.amount,
    invest_note: parsed.note,
    types: parsed.types,
  });
  // Postgres raises readable messages ("That exceeds your remaining
  // balance of $X") — surface them verbatim.
  if (error) throw new Error(error.message.replace(/^.*?: /, ""));

  // Email each founder. In-app notifications already happened inside the
  // transaction; email is the escalation and must never block.
  try {
    const [{ data: company }, { data: members }] = await Promise.all([
      supabase
        .from("companies")
        .select("name, slug")
        .eq("id", parsed.company_id)
        .single(),
      supabase
        .from("company_members")
        .select("profiles ( id, email, full_name )")
        .eq("company_id", parsed.company_id),
    ]);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    for (const m of members ?? []) {
      const p = (m as any).profiles;
      if (!p?.email) continue;
      await sendEmail({
        recipientId: p.id,
        toEmail: p.email,
        type: "investment_received",
        subject: `${company?.name ?? "Your company"} received a $${parsed.amount.toLocaleString()} investment`,
        bodyHtml: `<p>An investor just backed <b>${company?.name}</b> for <b>$${parsed.amount.toLocaleString()}</b>.</p>
<p>Their note: &ldquo;${parsed.note}&rdquo;</p>
<p><b>You have 72 hours to accept or decline.</b> If you do nothing, it auto-accepts.</p>
<p><a href="${siteUrl}/companies/${company?.slug}">Respond in the portal</a></p>`,
        bodyText: `An investor backed ${company?.name} for $${parsed.amount}. You have 72 hours to respond: ${siteUrl}/companies/${company?.slug}`,
        dedupeKey: `received:${(investment as { id?: string })?.id ?? parsed.company_id}:${p.id}`,
      });
    }
  } catch (err) {
    console.error("investment email failed:", err);
  }

  revalidatePath("/companies");
  revalidatePath("/portfolio");
  revalidatePath("/updates");
}

const respondSchema = z.object({
  investment_id: z.string().uuid(),
  decision: z.enum(["accepted", "declined"]),
});

export async function respondToInvestment(formData: FormData): Promise<void> {
  const parsed = respondSchema.parse({
    investment_id: formData.get("investment_id"),
    decision: formData.get("decision"),
  });

  const supabase = await createClient();
  // Founder-or-admin check happens inside the function.
  const { error } = await supabase.rpc("respond_to_investment", {
    investment: parsed.investment_id,
    new_status: parsed.decision,
  });
  if (error) throw new Error(error.message.replace(/^.*?: /, ""));

  // Declines email the investor (funds returned). Accepts stay in-app only.
  if (parsed.decision === "declined") {
    try {
      const { data: inv } = await supabase
        .from("investments")
        .select(
          "amount, investor:profiles!investments_investor_id_fkey ( id, email, full_name ), companies ( name, slug )"
        )
        .eq("id", parsed.investment_id)
        .single();
      const investor = (inv as any)?.investor;
      const company = (inv as any)?.companies;
      if (investor?.email) {
        await sendEmail({
          recipientId: investor.id,
          toEmail: investor.email,
          type: "investment_declined",
          subject: `Your investment in ${company?.name} was declined`,
          bodyHtml: `<p>Your $${(inv as any)?.amount?.toLocaleString()} investment in <b>${company?.name}</b> was declined by the founding team.</p>
<p>The full amount is back in your available balance.</p>`,
          bodyText: `Your $${(inv as any)?.amount} investment in ${company?.name} was declined. Funds returned to your balance.`,
          dedupeKey: `declined:${parsed.investment_id}`,
        });
      }
    } catch (err) {
      console.error("decline email failed:", err);
    }
  }

  revalidatePath("/companies");
  revalidatePath("/portfolio");
}

const resourceSchema = z.object({
  investment_id: z.string().uuid(),
  type: z.enum(["link", "mentor", "resource", "suggestion"]),
  title: z.string().trim().min(2).max(120),
  url: z.union([z.string().trim().url(), z.literal("")]).optional(),
  description: z.string().trim().max(500).optional(),
});

export async function attachResource(formData: FormData): Promise<void> {
  const parsed = resourceSchema.parse(Object.fromEntries(formData.entries()));
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_investment_resource", {
    investment: parsed.investment_id,
    r_type: parsed.type,
    r_title: parsed.title,
    r_url: parsed.url || null,
    r_description: parsed.description || null,
  });
  if (error) throw new Error(error.message.replace(/^.*?: /, ""));
  revalidatePath("/portfolio");
}
