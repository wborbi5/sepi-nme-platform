import "server-only";

import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The only place this codebase talks to Resend.
 *
 * Four rules, all of them load-bearing:
 *   1. Never throws. Callers wrap in try/catch anyway, but an email failure
 *      must not be able to unwind an investment even by accident.
 *   2. Writes email_log before and after every send.
 *   3. `dedupe_key` is unique — a cron retry hits the constraint and no-ops,
 *      which is the entire idempotency strategy.
 *   4. Checks email_prefs first and records a `skipped` row when opted out, so
 *      "why did I not get that" is answerable from the admin console.
 */

export type SendArgs = {
  to: string;
  recipientId?: string | null;
  /** Matches the opt-out key in profiles.email_prefs. */
  type: string;
  dedupeKey: string;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaPath?: string;
};

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendEmail(args: SendArgs): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }

  try {
    if (args.recipientId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email_prefs")
        .eq("id", args.recipientId)
        .maybeSingle();

      const prefs = (profile?.email_prefs ?? {}) as Record<string, boolean>;
      // Absent key means opted in.
      if (prefs[args.type] === false) {
        await admin.from("email_log").insert({
          recipient_id: args.recipientId,
          to_email: args.to,
          type: args.type,
          dedupe_key: args.dedupeKey,
          subject: args.subject,
          status: "skipped",
        });
        return;
      }
    }

    const { data: logged, error: logError } = await admin
      .from("email_log")
      .insert({
        recipient_id: args.recipientId ?? null,
        to_email: args.to,
        type: args.type,
        dedupe_key: args.dedupeKey,
        subject: args.subject,
        status: "queued",
      })
      .select("id")
      .single();

    // Unique violation on dedupe_key: this send already happened. That is the
    // success case for a retry, not an error.
    if (logError) return;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await admin
        .from("email_log")
        .update({ status: "skipped", error: "RESEND_API_KEY not set" })
        .eq("id", logged.id);
      return;
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SEPi NME <noreply@localhost>",
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to: args.to,
      subject: args.subject,
      html: renderHtml(args),
      text: renderText(args),
    });

    await admin
      .from("email_log")
      .update(
        error
          ? { status: "failed", error: error.message }
          : { status: "sent", resend_id: data?.id ?? null, sent_at: new Date().toISOString() },
      )
      .eq("id", logged.id);
  } catch {
    // Swallowed on purpose. See rule 1.
  }
}

/* ------------------------------------------------------------- templates */

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Tables, inline styles, no flexbox, PNG logo. Gmail mobile is where most of
 * these get read and it renders none of the modern layout primitives.
 */
function renderHtml(args: SendArgs): string {
  const base = siteUrl();
  const cta =
    args.ctaLabel && args.ctaPath
      ? `<tr><td style="padding:8px 0 4px 0;">
           <a href="${base}${args.ctaPath}"
              style="display:inline-block;background:#1F3A5F;color:#FFFFFF;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:3px;">
             ${escape(args.ctaLabel)}
           </a>
         </td></tr>`
      : "";

  const body = args.lines
    .map(
      (line) =>
        `<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#374151;padding-bottom:12px;">${escape(line)}</td></tr>`,
    )
    .join("");

  // Light palette on purpose: the app is dark, inboxes are not, and the brand
  // guide's light system is the one that governs anything leaving the screen.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #D1D5DB;border-radius:4px;">
      <tr><td style="padding:22px 24px 0 24px;">
        <img src="${base}/logo/eagle-navy-512.png" width="34" height="34" alt="Sigma Eta Pi" style="display:block;border:0;" />
      </td></tr>
      <tr><td style="padding:14px 24px 0 24px;font-family:Georgia,serif;font-size:21px;line-height:27px;color:#101828;font-weight:bold;">
        ${escape(args.heading)}
      </td></tr>
      <tr><td style="padding:14px 24px 22px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${body}
          ${cta}
        </table>
      </td></tr>
      <tr><td style="padding:14px 24px 20px 24px;border-top:1px solid #E5E7EB;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6B7280;">
        Sigma Eta Pi — New Member Education.
        <a href="${base}/settings/notifications" style="color:#2C4A73;">Change what we email you</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function renderText(args: SendArgs): string {
  const base = siteUrl();
  const cta = args.ctaLabel && args.ctaPath ? `\n${args.ctaLabel}: ${base}${args.ctaPath}\n` : "";
  return `${args.heading}\n\n${args.lines.join("\n\n")}\n${cta}
—
Sigma Eta Pi — New Member Education
Change what we email you: ${base}/settings/notifications
`;
}
