import Link from "next/link";

import { AdminHead, AdminPanel, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { dayMonth, money, timeLeft } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Company, Investment, Profile } from "@/lib/types";

export const metadata = { title: "Investments · Admin" };

type Row_ = Investment & {
  investor: Pick<Profile, "id" | "slug" | "full_name" | "email"> | null;
  company: Pick<Company, "name" | "slug"> | null;
};

export default async function AdminInvestmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: rows }, { data: investors }] = await Promise.all([
    supabase
      .from("investments")
      .select(
        "*, investor:profiles!investments_investor_id_fkey(id, slug, full_name, email), company:companies(name, slug)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["current_member", "admin"])
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const investments = (rows as unknown as Row_[] | null) ?? [];
  const people =
    (investors as Pick<Profile, "id" | "full_name" | "email" | "role">[] | null) ?? [];

  // Balances come from the function, per investor. There is no balance column
  // and there never will be — 50 users, one round trip each.
  const balances = await Promise.all(
    people.map(async (p) => {
      const { data } = await supabase.rpc("available_balance", { investor: p.id });
      return { ...p, available: Number(data ?? 0) };
    }),
  );

  const pending = investments.filter((i) => i.status === "pending");
  const accepted = investments.filter((i) => i.status === "accepted");
  const totalAccepted = accepted.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <AdminHead
        title="Investments"
        note="The full ledger. Every rule is enforced in place_investment(); nothing here bypasses it."
      />

      <AdminPanel title="Totals">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-[12px] text-[var(--color-text-dim)]">Accepted</dt>
            <dd className="text-[20px] font-bold tabular-nums text-[var(--cloud-white)]">
              {money(totalAccepted)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--color-text-dim)]">Pending</dt>
            <dd className="text-[20px] font-bold tabular-nums text-[var(--color-warning)]">
              {pending.length}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--color-text-dim)]">Total bets</dt>
            <dd className="text-[20px] font-bold tabular-nums text-[var(--color-text-muted)]">
              {investments.length}
            </dd>
          </div>
        </dl>
      </AdminPanel>

      <AdminPanel title="Investor balances">
        <Table head={["Investor", "Available", "Role"]}>
          {balances.map((b) => (
            <Row key={b.id}>
              <Cell className="text-[var(--cloud-white)]">{b.full_name ?? b.email}</Cell>
              <Cell className="tabular-nums text-[var(--cloud-white)]">
                {money(b.available)}
              </Cell>
              <Cell className="text-[var(--color-text-dim)]">{b.role}</Cell>
            </Row>
          ))}
        </Table>
      </AdminPanel>

      <AdminPanel title={`Ledger — ${investments.length}`}>
        <Table head={["When", "Investor", "Company", "Amount", "Status", "Note"]}>
          {investments.map((i) => (
            <Row key={i.id}>
              <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                {dayMonth(i.created_at)}
              </Cell>
              <Cell className="whitespace-nowrap">
                <Link href={`/p/${i.investor?.slug}`} className="text-[var(--cloud-white)]">
                  {i.investor?.full_name ?? i.investor?.email}
                </Link>
              </Cell>
              <Cell className="whitespace-nowrap">
                <Link href={`/c/${i.company?.slug}`} className="text-[var(--cloud-white)]">
                  {i.company?.name}
                </Link>
              </Cell>
              <Cell className="tabular-nums text-[var(--cloud-white)]">{money(i.amount)}</Cell>
              <Cell
                className={
                  i.status === "accepted"
                    ? "text-[var(--color-success)]"
                    : i.status === "declined"
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-warning)]"
                }
              >
                {i.status}
                {i.status === "pending" ? (
                  <span className="block text-[11px] text-[var(--color-text-dim)]">
                    {timeLeft(new Date(i.created_at).getTime() + 72 * 3600_000)}
                  </span>
                ) : null}
              </Cell>
              <Cell className="max-w-[320px] text-[var(--color-text-muted)]">{i.note}</Cell>
            </Row>
          ))}
          {investments.length === 0 ? (
            <Row>
              <Cell className="text-[var(--color-text-dim)]">No investments yet.</Cell>
            </Row>
          ) : null}
        </Table>
      </AdminPanel>
    </div>
  );
}
