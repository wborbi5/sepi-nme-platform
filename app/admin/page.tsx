import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export default async function AdminOverview() {
  let counts = { members: 0, companies: 0, investments: 0, pending: 0 };
  let windowOpen = false;

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const [m, c, i, p, s] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("investments").select("id", { count: "exact", head: true }),
      supabase
        .from("investments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("app_settings").select("investment_window_open").eq("id", 1).single(),
    ]);
    counts = {
      members: m.count ?? 0,
      companies: c.count ?? 0,
      investments: i.count ?? 0,
      pending: p.count ?? 0,
    };
    windowOpen = Boolean(s.data?.investment_window_open);
  }

  const cell = "border border-[#ddd] px-3 py-2";

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold">Overview</h1>
      <table className="text-[13px]">
        <tbody>
          <tr>
            <td className={cell}>Members</td>
            <td className={`${cell} text-right font-bold`}>{counts.members}</td>
          </tr>
          <tr>
            <td className={cell}>Companies</td>
            <td className={`${cell} text-right font-bold`}>{counts.companies}</td>
          </tr>
          <tr>
            <td className={cell}>Investments</td>
            <td className={`${cell} text-right font-bold`}>{counts.investments}</td>
          </tr>
          <tr>
            <td className={cell}>Pending investments</td>
            <td className={`${cell} text-right font-bold`}>{counts.pending}</td>
          </tr>
          <tr>
            <td className={cell}>Investment window</td>
            <td className={`${cell} text-right font-bold`}>
              {windowOpen ? "OPEN" : "closed"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
