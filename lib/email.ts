import "server-only";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";

/*
 * The one email door. Every send in the codebase goes through
 * sendEmail() — no scattered Resend calls.
 *
 * Guarantees:
 *  - Never throws. Email failure must never block the underlying action;
 *    callers do not even need their own try/catch (they keep one anyway).
 *  - Writes email_log before and after, with the Resend id.
 *  - Honors profiles.email_prefs: { [type]: false } means opted out —
 *    logged as 'skipped'.
 *  - Idempotent via dedupe_key (unique column): a retry no-ops.
 *  - Without RESEND_API_KEY the send is logged 'skipped' and the app
 *    behaves identically. Email is an escalation, not a dependency.
 */

export type EmailType =
  | "investment_received"
  | "investment_declined"
  | "response_reminder"
  | "sprint_rejected"
  | "weekly_digest";

const FROM = process.env.EMAIL_FROM ?? "SEPi Portal <portal@sigmaetapi-miami.org>";

function renderHtml(subject: string, bodyHtml: string, siteUrl: string): string {
  // Gmail-mobile-safe: tables, inline styles, no flexbox, no SVG.
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5ef;padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e1d8;">
<tr><td style="background:#0b1f3a;padding:16px 24px;font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#ffffff;">Sigma Eta Pi</td></tr>
<tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#101828;">
<p style="margin:0 0 12px;font-size:17px;font-weight:bold;">${subject}</p>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e1d8;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#667085;">
SEPi Portal — Miami University ·
<a href="${siteUrl}/settings/notifications" style="color:#667085;">email preferences</a>
</td></tr>
</table>
</td></tr></table>`;
}

export async function sendEmail(args: {
  recipientId: string | null;
  toEmail: string;
  type: EmailType;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  dedupeKey?: string;
}): Promise<void> {
  try {
    if (!serviceRoleConfigured()) return;
    const service = createServiceClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Opt-out check — absent key means opted in.
    if (args.recipientId) {
      const { data: prefs } = await service
        .from("profiles")
        .select("email_prefs")
        .eq("id", args.recipientId)
        .single();
      if (prefs?.email_prefs?.[args.type] === false) {
        await service.from("email_log").insert({
          recipient_id: args.recipientId,
          to_email: args.toEmail,
          type: args.type,
          subject: args.subject,
          status: "skipped",
          error: "opted out",
          dedupe_key: args.dedupeKey ?? null,
        });
        return;
      }
    }

    // Ledger row first — the unique dedupe_key makes retries no-op here.
    const { data: logRow, error: logErr } = await service
      .from("email_log")
      .insert({
        recipient_id: args.recipientId,
        to_email: args.toEmail,
        type: args.type,
        subject: args.subject,
        status: "queued",
        dedupe_key: args.dedupeKey ?? null,
      })
      .select("id")
      .single();
    if (logErr || !logRow) return; // duplicate dedupe_key or log failure — stop quietly

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await service
        .from("email_log")
        .update({ status: "skipped", error: "RESEND_API_KEY not set" })
        .eq("id", logRow.id);
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [args.toEmail],
        subject: args.subject,
        html: renderHtml(args.subject, args.bodyHtml, siteUrl),
        text: `${args.bodyText}\n\nEmail preferences: ${siteUrl}/settings/notifications`,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as { id?: string };
      await service
        .from("email_log")
        .update({ status: "sent", resend_id: body.id ?? null, sent_at: new Date().toISOString() })
        .eq("id", logRow.id);
    } else {
      await service
        .from("email_log")
        .update({ status: "failed", error: `${res.status} ${await res.text()}`.slice(0, 500) })
        .eq("id", logRow.id);
    }
  } catch (err) {
    // Never propagate. The action that triggered this email already succeeded.
    console.error("sendEmail failed:", err);
  }
}
