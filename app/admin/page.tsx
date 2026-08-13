import Link from "next/link";

import { AdminHead, AdminPanel } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · SEPi NME" };

export default async function AdminOverview() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    members,
    allowlist,
    unclaimed,
    companies,
    pendingInvestments,
    pendingSprint,
    pendingHomework,
    settings,
    totals,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("allowed_emails").select("email", { count: "exact", head: true }),
    supabase
      .from("allowed_emails")
      .select("email", { count: "exact", head: true })
      .is("claimed_at", null),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase
      .from("investments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("sprint_entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("assignment_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
    supabase.from("company_totals").select("raised"),
  ]);

  const raised = ((totals.data as { raised: number }[] | null) ?? []).reduce(
    (sum, r) => sum + r.raised,
    0,
  );

  const stats = [
    { label: "Active members", value: members.count ?? 0 },
    { label: "On the allowlist", value: allowlist.count ?? 0 },
    { label: "Not signed up yet", value: unclaimed.count ?? 0 },
    { label: "Companies", value: companies.count ?? 0 },
    { label: "Committed", value: money(raised) },
  ];

  const queues = [
    {
      label: "Investments awaiting a founder",
      value: pendingInvestments.count ?? 0,
      href: "/admin/investments",
    },
    { label: "Sprint entries to review", value: pendingSprint.count ?? 0, href: "/admin/sprint" },
    {
      label: "Homework to review",
      value: pendingHomework.count ?? 0,
      href: "/admin/assignments",
    },
  ];

  return (
    <div>
      <AdminHead title="Overview" />

      <AdminPanel title="Counts">
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[12px] text-[var(--color-text-dim)]">{s.label}</dt>
              <dd className="mt-0.5 text-[20px] font-bold tabular-nums text-[var(--cloud-white)]">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </AdminPanel>

      <AdminPanel title="Queues">
        <ul className="space-y-1.5">
          {queues.map((q) => (
            <li key={q.label}>
              <Link
                href={q.href}
                className="flex items-center justify-between gap-4 border border-[var(--color-border)] px-3 py-2 text-[13px] hover:bg-[var(--ink-raised)]"
              >
                <span className="text-[var(--color-text-muted)]">{q.label}</span>
                <span
                  className={`tabular-nums ${
                    q.value > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-dim)]"
                  }`}
                >
                  {q.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel title="Investment window">
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {settings.data?.investment_window_open ? "OPEN" : "CLOSED"} · {" "}
          {money(settings.data?.investment_min ?? 0)}–{money(settings.data?.investment_max ?? 0)}{" "}
          per investment · {money(settings.data?.investor_budget ?? 0)} budget each
        </p>
        <Link
          href="/admin/settings"
          className="mt-2 inline-block text-[13px] text-[var(--cobalt-lift)]"
        >
          Change →
        </Link>
      </AdminPanel>
    </div>
  );
}
