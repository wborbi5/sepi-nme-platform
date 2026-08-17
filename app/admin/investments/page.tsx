import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { resolveInvestment, voidInvestment } from "../actions";

/*
 * The full ledger: every investment, every balance. Force-resolve
 * pendings (goes through respond_to_investment so notifications fire)
 * or void a row outright (service role delete — funds return because
 * balance is always computed, never stored).
 */

type Ledger = {
  id: string;
  amount: number;
  note: string;
  status: string;
  created_at: string;
  investor: { id: string; full_name: string | null; email: string } | null;
  company: { name: string; slug: string } | null;
};

export default async function AdminInvestments() {
  let rows: Ledger[] = [];
  let balances: { name: string; committed: number; available: number }[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const [invRes, invRoleRes, settingsRes] = await Promise.all([
      supabase
        .from("investments")
        .select(
          `id, amount, note, status, created_at,
           investor:profiles!investments_investor_id_fkey ( id, full_name, email ),
           company:companies ( name, slug )`
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("role", ["current_member", "admin"])
        .eq("is_active", true),
      supabase.from("app_settings").select("investor_budget").eq("id", 1).single(),
    ]);

    rows = (invRes.data as unknown as Ledger[]) ?? [];
    const budget = settingsRes.data?.investor_budget ?? 200000;

    // Balance = budget − pending/accepted commitments. Computed here from
    // the ledger we already fetched — same math as available_balance().
    balances = ((invRoleRes.data ?? []) as { id: string; full_name: string | null; email: string }[])
      .map((p) => {
        const committed = rows
          .filter(
            (r) =>
              r.investor?.id === p.id &&
              (r.status === "pending" || r.status === "accepted")
          )
          .reduce((s, r) => s + r.amount, 0);
        return {
          name: p.full_name ?? p.email,
          committed,
          available: budget - committed,
        };
      })
      .sort((a, b) => b.committed - a.committed);
  }

  const th = "border border-[#ddd] bg-[#f5f5f5] px-2 py-1 text-left font-semibold";
  const td = "border border-[#ddd] px-2 py-1 align-middle";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd] min-h-0 cursor-pointer";

  return (
    <div className="text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Investments</h1>

      <h2 className="mb-2 font-bold">Investor balances</h2>
      <table className="mb-6 border-collapse">
        <thead>
          <tr>
            <th className={th}>Investor</th>
            <th className={th}>Committed</th>
            <th className={th}>Available</th>
          </tr>
        </thead>
        <tbody>
          {balances.length === 0 && (
            <tr>
              <td className={td} colSpan={3}>
                No investors yet.
              </td>
            </tr>
          )}
          {balances.map((b) => (
            <tr key={b.name}>
              <td className={td}>{b.name}</td>
              <td className={`${td} text-right`}>${b.committed.toLocaleString()}</td>
              <td className={`${td} text-right`}>${b.available.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-bold">Ledger</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Date</th>
            <th className={th}>Investor</th>
            <th className={th}>Company</th>
            <th className={th}>Amount</th>
            <th className={th}>Status</th>
            <th className={th}>Note</th>
            <th className={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className={td} colSpan={7}>
                No investments yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}>{new Date(r.created_at).toLocaleDateString()}</td>
              <td className={td}>{r.investor?.full_name ?? r.investor?.email}</td>
              <td className={td}>{r.company?.name}</td>
              <td className={`${td} text-right`}>${r.amount.toLocaleString()}</td>
              <td className={td}>
                <b
                  className={
                    r.status === "pending"
                      ? "text-[#b45309]"
                      : r.status === "accepted"
                        ? "text-[#15803d]"
                        : "text-[#b91c1c]"
                  }
                >
                  {r.status}
                </b>
              </td>
              <td className={`${td} max-w-[300px]`}>{r.note}</td>
              <td className={td}>
                <div className="flex gap-1">
                  {r.status === "pending" && (
                    <>
                      <form action={resolveInvestment}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="accepted" />
                        <button type="submit" className={btn}>
                          Accept
                        </button>
                      </form>
                      <form action={resolveInvestment}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="declined" />
                        <button type="submit" className={btn}>
                          Decline
                        </button>
                      </form>
                    </>
                  )}
                  <form action={voidInvestment}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={btn}>
                      Void
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
