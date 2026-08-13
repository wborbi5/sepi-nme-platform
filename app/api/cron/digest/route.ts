import { NextResponse, type NextRequest } from "next/server";

import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Mondays, 7am ET. Sessions this week, deadlines, and anything pending your
 * action — nothing else. The dedupe key is the ISO week, so a retry is a no-op.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 24 * 3600_000);
  const weekKey = today.toISOString().slice(0, 10);

  const [{ data: events }, { data: members }] = await Promise.all([
    admin
      .from("cal_events")
      .select("title, event_date, start_time, location")
      .gte("event_date", today.toISOString().slice(0, 10))
      .lte("event_date", weekEnd.toISOString().slice(0, 10))
      .order("event_date"),
    admin.from("profiles").select("id, email, full_name").eq("is_active", true),
  ]);

  const sessions = (events ?? []) as {
    title: string;
    event_date: string;
    start_time: string | null;
    location: string | null;
  }[];

  const people = (members ?? []) as { id: string; email: string; full_name: string | null }[];

  let sent = 0;

  for (const person of people) {
    // The to-do function is the same source the app renders from — the digest
    // never computes its own idea of what is owed.
    const { data: todos } = await admin.rpc("todos_for", { target: person.id });
    const owed = (todos ?? []) as { title: string; urgency: string }[];
    const pressing = owed.filter((t) => t.urgency === "overdue" || t.urgency === "now");

    // Nothing scheduled and nothing owed is not worth an email.
    if (sessions.length === 0 && pressing.length === 0) continue;

    const lines: string[] = [];

    if (sessions.length > 0) {
      lines.push("This week:");
      for (const s of sessions) {
        const when = new Date(`${s.event_date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
        lines.push(
          `${when}${s.start_time ? ` at ${s.start_time.slice(0, 5)}` : ""} — ${s.title}${
            s.location ? ` (${s.location})` : ""
          }`,
        );
      }
    }

    if (pressing.length > 0) {
      lines.push(`${pressing.length} thing${pressing.length === 1 ? "" : "s"} need you:`);
      for (const t of pressing.slice(0, 5)) lines.push(t.title);
    }

    await sendEmail({
      to: person.email,
      recipientId: person.id,
      type: "weekly_digest",
      dedupeKey: `digest:${weekKey}:${person.id}`,
      subject: pressing.length > 0 ? `${pressing.length} things need you this week` : "This week at SEPi",
      heading: "This week",
      lines,
      ctaLabel: "Open your to-do",
      ctaPath: "/todo",
    });
    sent += 1;
  }

  return NextResponse.json({ recipients: people.length, sent });
}
