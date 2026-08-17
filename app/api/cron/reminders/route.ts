import { NextResponse } from "next/server";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/*
 * Response-reminder cron. Finds pending investments past the 48-hour
 * mark (≤24h before auto-accept) and emails each founder once —
 * dedupe_key reminder:{investment_id}:{founder} guarantees exactly one
 * send no matter how often this runs, so it works on Vercel Hobby's
 * daily cron and gets more precise if upgraded to hourly on Pro.
 */

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ sent: 0, note: "supabase not configured" });
  }

  const service = createServiceClient();
  // Older than 48h (reminder due), younger than 72h (not yet auto-accepted).
  const dueBefore = new Date(Date.now() - 48 * 3600_000).toISOString();
  const notExpired = new Date(Date.now() - 72 * 3600_000).toISOString();

  const { data: pendings } = await service
    .from("investments")
    .select("id, amount, company_id, companies ( name, slug )")
    .eq("status", "pending")
    .lte("created_at", dueBefore)
    .gte("created_at", notExpired);

  let sent = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  for (const inv of pendings ?? []) {
    const company = (inv as any).companies;
    const { data: members } = await service
      .from("company_members")
      .select("profiles ( id, email )")
      .eq("company_id", (inv as any).company_id);
    for (const m of members ?? []) {
      const p = (m as any).profiles;
      if (!p?.email) continue;
      await sendEmail({
        recipientId: p.id,
        toEmail: p.email,
        type: "response_reminder",
        subject: `24 hours left: $${(inv as any).amount.toLocaleString()} pending on ${company?.name}`,
        bodyHtml: `<p>A $${(inv as any).amount.toLocaleString()} investment in <b>${company?.name}</b> auto-accepts in about 24 hours.</p>
<p><a href="${siteUrl}/companies/${company?.slug}">Accept or decline now</a> — silence is acceptance.</p>`,
        bodyText: `A $${(inv as any).amount} investment in ${company?.name} auto-accepts in ~24h: ${siteUrl}/companies/${company?.slug}`,
        dedupeKey: `reminder:${(inv as any).id}:${p.id}`,
      });
      sent++;
    }
  }

  return NextResponse.json({ candidates: pendings?.length ?? 0, sent });
}
