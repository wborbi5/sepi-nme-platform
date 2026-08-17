import Link from "next/link";
import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import AttachResourceForm from "@/components/AttachResourceForm";
import { getNavSession, getSettings } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Portfolio — SEPi Portal" };

/* Your investments, amounts, statuses, remaining balance. Prominent. */
export default async function PortfolioPage() {
  if (!supabaseConfigured()) redirect("/");
  const nav = await getNavSession();
  if (!nav.userId) redirect("/login?next=/portfolio");

  const supabase = await createClient();
  const [settings, invRes, balRes] = await Promise.all([
    getSettings(),
    supabase
      .from("investments")
      .select(
        "id, amount, note, status, created_at, responded_at, companies ( name, slug )"
      )
      .eq("investor_id", nav.userId)
      .order("created_at", { ascending: false }),
    supabase.rpc("available_balance", { investor: nav.userId }),
  ]);

  const investments = (invRes.data ?? []) as unknown as {
    id: string;
    amount: number;
    note: string;
    status: string;
    created_at: string;
    responded_at: string | null;
    companies: { name: string; slug: string } | null;
  }[];

  const budget = settings?.investor_budget ?? 200000;
  const balance = typeof balRes.data === "number" ? balRes.data : budget;
  const committed = investments
    .filter((i) => i.status !== "declined")
    .reduce((s, i) => s + i.amount, 0);

  const statusStyle: Record<string, string> = {
    pending: "bg-[#fef3c7] text-[#b45309]",
    accepted: "bg-[#dcfce7] text-[#15803d]",
    declined: "bg-stone text-steel",
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-2xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-6xl">Portfolio</h1>

        {/* balance — prominent, per spec */}
        <div className="rounded-xl border border-stone bg-paper p-6 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-steel">
            Available balance
          </p>
          <p className="mt-1 text-5xl font-extrabold text-navy">
            ${balance.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-steel">
            ${committed.toLocaleString()} committed of your $
            {budget.toLocaleString()} budget
            {settings?.investment_window_open
              ? " · window is OPEN"
              : " · window is closed"}
          </p>
          <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-stone">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${Math.min(100, Math.round((committed / budget) * 100))}%` }}
            />
          </div>
        </div>

        {/* investments */}
        <h2 className="mt-12 text-xl font-extrabold text-midnight">
          Your investments
        </h2>
        {investments.length === 0 && (
          <p className="mt-4 text-slate-blue">
            Nothing yet. When the window opens, find a company in the{" "}
            <Link href="/companies" className="font-bold text-oxford hover:underline">
              directory
            </Link>{" "}
            and back it.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {investments.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-stone bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/companies/${inv.companies?.slug}`}
                  className="text-lg font-bold text-midnight hover:text-oxford"
                >
                  {inv.companies?.name}
                </Link>
                <span className="flex items-center gap-2">
                  <b className="text-navy">${inv.amount.toLocaleString()}</b>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${statusStyle[inv.status] ?? ""}`}
                  >
                    {inv.status}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-6 text-midnight">
                &ldquo;{inv.note}&rdquo;
              </p>
              <p className="mt-2 text-xs text-steel">
                Placed {new Date(inv.created_at).toLocaleDateString()}
                {inv.status === "pending" &&
                  " · auto-accepts 72h after placement"}
                {inv.status === "declined" && " · funds returned to your balance"}
              </p>
              {inv.status !== "declined" && (
                <div className="mt-3">
                  <AttachResourceForm investmentId={inv.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
