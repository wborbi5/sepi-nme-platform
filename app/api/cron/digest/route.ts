import { NextResponse } from "next/server";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/*
 * Monday-morning digest (schedule "0 11 * * 1" UTC ≈ 7am ET). Sessions
 * this week + anything pending your action. dedupe_key
 * digest:{iso-week}:{profile} makes a retried run no-op per person.
 */

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ sent: 0, note: "supabase not configured" });
  }

  const service = createServiceClient();
  const today = new Date();
  const weekKey = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [{ data: events }, { data: members }, { data: pendings }] = await Promise.all([
    service
      .from("cal_events")
      .select("title, event_date, start_time, location")
      .gte("event_date", weekKey)
      .lt("event_date", weekEnd)
      .order("event_date"),
    service
      .from("profiles")
      .select("id, email, full_name")
      .eq("is_active", true),
    service
      .from("investments")
      .select("company_id, amount, companies ( name )")
      .eq("status", "pending"),
  ]);

  // Which members have a pending investment waiting on them (as founders)?
  const pendingByCompany = new Map<string, number>();
  for (const p of pendings ?? []) {
    pendingByCompany.set(
      (p as any).company_id,
      ((pendingByCompany.get((p as any).company_id) ?? 0) + 1)
    );
  }
  const { data: memberships } = await service
    .from("company_members")
    .select("company_id, profile_id");
  const pendingByProfile = new Map<string, number>();
  for (const m of memberships ?? []) {
    const count = pendingByCompany.get((m as any).company_id);
    if (count)
      pendingByProfile.set(
        (m as any).profile_id,
        (pendingByProfile.get((m as any).profile_id) ?? 0) + count
      );
  }

  const eventsHtml =
    (events ?? []).length > 0
      ? `<p><b>This week:</b></p><ul>${(events ?? [])
          .map(
            (e) =>
              `<li>${e.title} — ${e.event_date}${e.start_time ? ` ${e.start_time.slice(0, 5)}` : ""}${e.location ? ` · ${e.location}` : ""}</li>`
          )
          .join("")}</ul>`
      : "<p>No sessions scheduled this week.</p>";

  let sent = 0;
  for (const member of members ?? []) {
    const pendingCount = pendingByProfile.get(member.id) ?? 0;
    const pendingHtml = pendingCount
      ? `<p><b>Action needed:</b> ${pendingCount} pending investment${pendingCount === 1 ? "" : "s"} on your company — <a href="${siteUrl}/portfolio">respond in the portal</a>.</p>`
      : "";
    await sendEmail({
      recipientId: member.id,
      toEmail: member.email,
      type: "weekly_digest",
      subject: "SEPi this week",
      bodyHtml: `${eventsHtml}${pendingHtml}`,
      bodyText: `Sessions this week: ${(events ?? []).map((e) => `${e.title} ${e.event_date}`).join("; ") || "none"}.${pendingCount ? ` ${pendingCount} pending investment(s) need your response.` : ""}`,
      dedupeKey: `digest:${weekKey}:${member.id}`,
    });
    sent++;
  }

  return NextResponse.json({ events: events?.length ?? 0, sent });
}
