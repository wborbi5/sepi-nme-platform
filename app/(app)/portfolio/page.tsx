import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoTile } from "@/components/avatar";
import { Chip, Empty, SectionHead } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { money, relative, timeLeft } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Company, Investment } from "@/lib/types";

export const metadata = { title: "Portfolio · SEPi NME" };

type Row = Investment & { company: Pick<Company, "name" | "slug" | "logo_path"> | null };

export default async function PortfolioPage() {
  const profile = await requireProfile();
  // New members have no budget, so there is nothing here for them.
  if (profile.role === "new_member") redirect("/directory");

  const supabase = await createClient();

  const [{ data: rows }, { data: balance }, { data: committed }, settings] = await Promise.all([
    supabase
      .from("investments")
      .select("*, company:companies(name, slug, logo_path)")
      .eq("investor_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("available_balance", { investor: profile.id }),
    supabase.rpc("committed_total", { investor: profile.id }),
    getSettings(),
  ]);

  const investments = (rows as unknown as Row[] | null) ?? [];
  const available = Number(balance ?? 0);
  const deployed = Number(committed ?? 0);
  const budget = settings?.investor_budget ?? 200000;

  const accepted = investments.filter((i) => i.status === "accepted");
  const pending = investments.filter((i) => i.status === "pending");

  return (
    <div className="space-y-9">
      <header className="border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Portfolio</h1>

        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
          <div>
            <div className="eyebrow">Available</div>
            <div className="figure mt-1 text-[38px] text-[var(--cloud-white)]">
              {money(available)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Committed</div>
            <div className="figure mt-1 text-[38px] text-[var(--color-text-muted)]">
              {money(deployed)}
            </div>
          </div>
          <div>
            <div className="eyebrow">Bets</div>
            <div className="figure mt-1 text-[38px] text-[var(--color-text-muted)]">
              {investments.length}
            </div>
          </div>
        </div>

        <div className="mt-5 h-[5px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--cobalt-lift)]"
            style={{ width: `${Math.min(100, Math.round((deployed / budget) * 100))}%` }}
          />
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--color-text-dim)]">
          {money(deployed)} of {money(budget)} deployed
          {settings && !settings.investment_window_open ? " · window closed" : ""}
        </p>
      </header>

      {pending.length > 0 ? (
        <section>
          <SectionHead title="Awaiting a founder" />
          <ul className="space-y-3">
            {pending.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/c/${inv.company?.slug}`}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--ink-raised)] px-4 py-3.5"
                >
                  <LogoTile name={inv.company?.name ?? "?"} path={inv.company?.logo_path} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] text-[var(--cloud-white)]">
                      {inv.company?.name}
                    </div>
                    <div className="text-[12px] text-[var(--color-warning)]">
                      {timeLeft(new Date(inv.created_at).getTime() + 72 * 3600_000)} to auto-accept
                    </div>
                  </div>
                  <span className="figure text-[17px] text-[var(--cloud-white)]">
                    {money(inv.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionHead title="Your bets" />
        {investments.length === 0 ? (
          <Empty>
            Nothing yet.{" "}
            <Link href="/members" className="text-[var(--cobalt-lift)]">
              Go read some profiles
            </Link>
            .
          </Empty>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {investments.map((inv) => (
              <li key={inv.id} className="py-4">
                <div className="flex items-start gap-3">
                  <LogoTile
                    name={inv.company?.name ?? "?"}
                    path={inv.company?.logo_path}
                    size={30}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={`/c/${inv.company?.slug}`}
                        className="text-[15px] font-medium text-[var(--cloud-white)]"
                      >
                        {inv.company?.name}
                      </Link>
                      <span className="figure shrink-0 text-[16px] text-[var(--cloud-white)]">
                        {money(inv.amount)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-[1.45] text-[var(--color-text-dim)]">
                      “{inv.note}”
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Chip
                        tone={
                          inv.status === "accepted"
                            ? "success"
                            : inv.status === "declined"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {inv.status}
                      </Chip>
                      <span className="text-[11px] text-[var(--color-text-dim)]">
                        {relative(inv.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {accepted.length > 0 ? (
        <p className="text-[12px] text-[var(--color-text-dim)]">
          {accepted.length} accepted. Investments cannot be withdrawn — only a founder can
          decline.
        </p>
      ) : null}
    </div>
  );
}
