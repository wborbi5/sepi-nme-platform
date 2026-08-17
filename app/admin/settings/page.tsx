import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { updateSettings } from "../actions";

export default async function AdminSettings() {
  let s = {
    investment_window_open: false,
    investment_opens_at: null as string | null,
    investment_closes_at: null as string | null,
    investment_min: 10000,
    investment_max: 100000,
    investor_budget: 200000,
  };

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    if (data) s = data;
  }

  const input = "border border-[#bbb] px-1.5 py-0.5 text-[13px] min-h-0";
  const btn =
    "border border-[#888] bg-[#eee] px-2 py-1 text-[13px] hover:bg-[#ddd] min-h-0 cursor-pointer";
  const row = "flex items-center justify-between gap-4 border-b border-[#eee] py-2";

  return (
    <div className="max-w-lg text-[13px]">
      <h1 className="mb-4 text-lg font-bold">Settings</h1>
      <form action={updateSettings}>
        <div className={row}>
          <b>Investment window</b>
          <select
            name="investment_window_open"
            defaultValue={String(s.investment_window_open)}
            className={input}
          >
            <option value="false">closed</option>
            <option value="true">OPEN</option>
          </select>
        </div>
        <div className={row}>
          <span>Scheduled dates</span>
          <span className="text-[#666]">
            {s.investment_opens_at
              ? new Date(s.investment_opens_at).toLocaleDateString()
              : "—"}{" "}
            →{" "}
            {s.investment_closes_at
              ? new Date(s.investment_closes_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
        <div className={row}>
          <span>Minimum investment ($)</span>
          <input
            name="investment_min"
            defaultValue={s.investment_min}
            inputMode="numeric"
            className={`${input} w-28 text-right`}
          />
        </div>
        <div className={row}>
          <span>Maximum investment ($)</span>
          <input
            name="investment_max"
            defaultValue={s.investment_max}
            inputMode="numeric"
            className={`${input} w-28 text-right`}
          />
        </div>
        <div className={row}>
          <span>Investor budget ($)</span>
          <input
            name="investor_budget"
            defaultValue={s.investor_budget}
            inputMode="numeric"
            className={`${input} w-28 text-right`}
          />
        </div>
        <div className="pt-3">
          <button type="submit" className={btn}>
            Save settings
          </button>
        </div>
      </form>
      <p className="mt-4 text-[12px] text-[#666]">
        The boolean is the actual gate — place_investment() checks it inside
        the transaction. Dates are informational and seeded for Nov 2 → Nov
        23, 2026.
      </p>
    </div>
  );
}
