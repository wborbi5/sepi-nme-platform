import { NextResponse, type NextRequest } from "next/server";

import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Hourly. Emails founders with 24 hours left on a pending investment.
 *
 * Idempotency is entirely the `reminder:{investment_id}` dedupe key — the
 * unique constraint on email_log means a retry, an overlapping run, or a
 * duplicate Vercel invocation all no-op instead of double-sending.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Between 48 and 72 hours old: less than a day left, not yet auto-accepted.
  const now = Date.now();
  const { data: pending } = await admin
    .from("investments")
    .select(
      "id, amount, created_at, company:companies(id, name, slug), investor:profiles!investments_investor_id_fkey(full_name)",
    )
    .eq("status", "pending")
    .lt("created_at", new Date(now - 48 * 3600_000).toISOString())
    .gt("created_at", new Date(now - 72 * 3600_000).toISOString());

  const rows = (pending ?? []) as unknown as {
    id: string;
    amount: number;
    created_at: string;
    company: { id: string; name: string; slug: string } | null;
    investor: { full_name: string | null } | null;
  }[];

  let sent = 0;

  for (const inv of rows) {
    if (!inv.company) continue;

    const { data: founders } = await admin
      .from("company_members")
      .select("profiles(id, email)")
      .eq("company_id", inv.company.id);

    for (const row of (founders ?? []) as unknown as {
      profiles: { id: string; email: string } | null;
    }[]) {
      if (!row.profiles) continue;

      await sendEmail({
        to: row.profiles.email,
        recipientId: row.profiles.id,
        type: "investment_reminder",
        dedupeKey: `reminder:${inv.id}:${row.profiles.id}`,
        subject: `24 hours left to respond — ${inv.company.name}`,
        heading: "One day left",
        lines: [
          `${inv.investor?.full_name ?? "A member"} committed $${inv.amount.toLocaleString("en-US")} to ${inv.company.name}.`,
          "If you do not respond, it accepts automatically at the 72-hour mark.",
        ],
        ctaLabel: "Accept or decline",
        ctaPath: `/c/${inv.company.slug}`,
      });
      sent += 1;
    }
  }

  return NextResponse.json({ checked: rows.length, sent });
}
