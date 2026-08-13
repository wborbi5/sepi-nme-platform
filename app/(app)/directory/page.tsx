import Link from "next/link";

import { LogoTile } from "@/components/avatar";
import { Chip, Empty } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyTotals } from "@/lib/types";

export const metadata = { title: "Companies · SEPi NME" };

/**
 * The YC directory, in the dark. One line per company, no cards, no padding.
 * Fifteen rows visible on a laptop without scrolling.
 */
export default async function DirectoryPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: companies }, { data: totals }] = await Promise.all([
    supabase.from("companies").select("*").order("name"),
    supabase.from("company_totals").select("*"),
  ]);

  const byId = new Map(
    ((totals as CompanyTotals[] | null) ?? []).map((t) => [t.company_id, t]),
  );

  const rows = ((companies as Company[] | null) ?? [])
    .map((c) => ({
      ...c,
      raised: byId.get(c.id)?.raised ?? 0,
      backers: byId.get(c.id)?.backer_count ?? 0,
    }))
    .sort((a, b) => b.raised - a.raised || a.name.localeCompare(b.name));

  const topRaise = Math.max(1, ...rows.map((r) => r.raised));
  const totalRaised = rows.reduce((sum, r) => sum + r.raised, 0);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Companies</h1>
        <div className="flex gap-7">
          <div>
            <div className="eyebrow">Building</div>
            <div className="figure mt-0.5 text-[20px] text-[var(--cloud-white)]">
              {rows.length}
            </div>
          </div>
          <div>
            <div className="eyebrow">Committed</div>
            <div className="figure mt-0.5 text-[20px] text-[var(--cloud-white)]">
              {money(totalRaised)}
            </div>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <Empty>Nothing on the board yet.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {rows.map((company) => (
            <li key={company.id}>
              <Link href={`/c/${company.slug}`} className="flex items-center gap-3 py-3">
                <LogoTile name={company.name} path={company.logo_path} size={30} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[15px] font-medium text-[var(--cloud-white)]">
                      {company.name}
                    </span>
                    {company.status !== "active" ? (
                      <Chip tone={company.status === "killed" ? "danger" : "warning"}>
                        {company.status}
                      </Chip>
                    ) : null}
                  </div>
                  <div className="truncate text-[13px] text-[var(--color-text-muted)]">
                    {company.one_liner}
                  </div>
                </div>

                {company.investable ? (
                  <div className="hidden w-[110px] shrink-0 sm:block">
                    <div
                      className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]"
                      role="img"
                      aria-label={`${money(company.raised)} raised`}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--cloud-white)]"
                        style={{ width: `${Math.round((company.raised / topRaise) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="hidden w-[110px] shrink-0 sm:block" />
                )}

                <div className="w-[76px] shrink-0 text-right">
                  <div className="figure text-[15px] text-[var(--cloud-white)]">
                    {company.investable ? money(company.raised) : "—"}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-dim)]">
                    {company.investable ? `${company.backers} backers` : "not raising"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
