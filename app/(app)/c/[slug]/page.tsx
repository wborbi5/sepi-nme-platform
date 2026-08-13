import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";

import { Avatar, LogoTile } from "@/components/avatar";
import { InvestEntry } from "@/components/invest-entry";
import { RespondButtons } from "@/components/respond-buttons";
import { Chip, Divider, Empty, SectionHead } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { money, relative, timeLeft } from "@/lib/format";
import { PUBLIC_HEADINGS, PUBLIC_KEYS } from "@/lib/application-questions";
import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyTotals, Investment, Post, Profile } from "@/lib/types";

type Backer = Investment & {
  investor: Pick<Profile, "id" | "slug" | "full_name" | "avatar_path"> | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${slug} · SEPi NME` };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
  const company = data as Company | null;
  if (!company) notFound();

  const [
    { data: totalsRow },
    { data: memberRows },
    { data: investmentRows },
    { data: answerRows },
    { data: postRows },
    settings,
    { data: topRow },
  ] = await Promise.all([
    supabase.from("company_totals").select("*").eq("company_id", company.id).maybeSingle(),
    supabase
      .from("company_members")
      .select("role, profiles(id, slug, full_name, avatar_path, headline)")
      .eq("company_id", company.id),
    supabase
      .from("investments")
      .select(
        "*, investor:profiles!investments_investor_id_fkey(id, slug, full_name, avatar_path)",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("application_public")
      .select("*")
      .eq("company_id", company.id)
      .order("pass_number", { ascending: false })
      .limit(1),
    supabase
      .from("posts")
      .select("*")
      .eq("company_id", company.id)
      .order("published_at", { ascending: false }),
    getSettings(),
    supabase.from("company_totals").select("raised").order("raised", { ascending: false }).limit(1),
  ]);

  const totals = (totalsRow as CompanyTotals | null) ?? {
    company_id: company.id,
    raised: 0,
    backer_count: 0,
  };

  const founders = ((memberRows ?? []) as unknown as {
    role: string | null;
    profiles: Pick<Profile, "id" | "slug" | "full_name" | "avatar_path" | "headline"> | null;
  }[]).filter((r) => r.profiles);

  const investments = (investmentRows as unknown as Backer[] | null) ?? [];
  const accepted = investments.filter((i) => i.status === "accepted");
  const pending = investments.filter((i) => i.status === "pending");
  const answers = ((answerRows ?? []) as Record<string, unknown>[])[0] ?? null;
  const posts = (postRows as Post[] | null) ?? [];

  const topRaised = Math.max(1, ((topRow ?? []) as { raised: number }[])[0]?.raised ?? 1);

  const isFounder =
    company.created_by === viewer.id || founders.some((f) => f.profiles?.id === viewer.id);

  const canInvest =
    company.investable &&
    !isFounder &&
    (viewer.role === "current_member" || viewer.role === "admin") &&
    Boolean(settings?.investment_window_open) &&
    !investments.some((i) => i.investor_id === viewer.id);

  const myPending = pending.filter(() => isFounder);

  return (
    <div className="space-y-9">
      <header>
        <div className="flex items-start gap-4">
          <LogoTile name={company.name} path={company.logo_path} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] leading-none text-[var(--cloud-white)]">
                {company.name}
              </h1>
              {company.status !== "active" ? (
                <Chip tone={company.status === "killed" ? "danger" : "warning"}>
                  {company.status}
                </Chip>
              ) : null}
              {!company.investable ? <Chip>not raising</Chip> : null}
            </div>
            <p className="mt-1.5 text-[15px] text-[var(--color-text-muted)]">
              {company.one_liner}
            </p>
          </div>
        </div>

        {founders.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {founders.map((f) => (
              <Link
                key={f.profiles!.id}
                href={`/p/${f.profiles!.slug}`}
                className="flex items-center gap-2"
              >
                <Avatar
                  name={f.profiles!.full_name}
                  path={f.profiles!.avatar_path}
                  size={26}
                />
                <span className="text-[14px] text-[var(--cloud-white)]">
                  {f.profiles!.full_name}
                </span>
                {f.role ? (
                  <span className="text-[12px] text-[var(--color-text-dim)]">{f.role}</span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      {/* The raise, above everything else. Kickstarter treatment. */}
      {company.investable ? (
        <section>
          <div className="flex items-end gap-8">
            <div>
              <div className="eyebrow">Raised</div>
              <div className="figure mt-1 text-[34px] text-[var(--cloud-white)]">
                {money(totals.raised)}
              </div>
            </div>
            <div>
              <div className="eyebrow">Backers</div>
              <div className="figure mt-1 text-[34px] text-[var(--cloud-white)]">
                {totals.backer_count}
              </div>
            </div>
          </div>

          <div
            className="mt-4 h-[5px] w-full overflow-hidden rounded-full bg-[var(--color-border)]"
            role="img"
            aria-label={`${money(totals.raised)} raised`}
          >
            <div
              className="h-full rounded-full bg-[var(--cloud-white)] transition-[width] duration-500"
              style={{ width: `${Math.round((totals.raised / topRaised) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--color-text-dim)]">
            Relative to the top raise in the cohort.
          </p>

          {canInvest ? (
            <div className="mt-5">
              <InvestEntry
                company={{ id: company.id, name: company.name, slug: company.slug }}
                founderName={founders[0]?.profiles?.full_name?.split(" ")[0] ?? "the founder"}
                min={settings?.investment_min ?? 10000}
                max={settings?.investment_max ?? 100000}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Pending, for the people who have to answer it. */}
      {isFounder && myPending.length > 0 ? (
        <section>
          <SectionHead title="Waiting on you" />
          <ul className="space-y-3">
            {myPending.map((inv) => (
              <li
                key={inv.id}
                className="rounded-[var(--radius-lg)] border border-[#5c4318] bg-[var(--ink-raised)] px-4 py-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] text-[var(--cloud-white)]">
                    {inv.investor?.full_name} · {money(inv.amount)}
                  </span>
                  <span className="text-[12px] text-[var(--color-warning)]">
                    {timeLeft(new Date(inv.created_at).getTime() + 72 * 3600_000)}
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
                  “{inv.note}”
                </p>
                <div className="mt-3.5">
                  <RespondButtons investmentId={inv.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Backers, high on the page. The notes are the point. */}
      {company.investable ? (
        <section>
          <SectionHead title="Backers" />
          {accepted.length === 0 ? (
            <Empty>No backers yet.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {accepted.map((inv) => (
                <li key={inv.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={inv.investor?.full_name}
                      path={inv.investor?.avatar_path}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link
                          href={`/p/${inv.investor?.slug}`}
                          className="text-[14px] font-medium text-[var(--cloud-white)]"
                        >
                          {inv.investor?.full_name}
                        </Link>
                        <span className="figure shrink-0 text-[16px] text-[var(--cloud-white)]">
                          {money(inv.amount)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
                        “{inv.note}”
                      </p>
                      {inv.commitment_types.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {inv.commitment_types.map((t) => (
                            <li key={t}>
                              <Chip tone="accent">{t}</Chip>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Section 3 of the application. Section 2 never leaves the database. */}
      {answers ? (
        <section>
          <SectionHead title="The pitch" />
          <dl className="space-y-4">
            {PUBLIC_KEYS.map((key) => {
              const value = answers[key];
              if (!value || typeof value !== "string") return null;
              return (
                <div key={key}>
                  <dt className="eyebrow">{PUBLIC_HEADINGS[key]}</dt>
                  <dd className="mt-1 text-[15px] leading-[1.55] text-[var(--color-text-muted)]">
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      ) : null}

      {(company.deck_path || company.demo_url || company.website_url) ? (
        <section className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[var(--color-border)] py-4 text-[14px]">
          {company.website_url ? (
            <a
              href={company.website_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--cobalt-lift)]"
            >
              Website
            </a>
          ) : null}
          {company.demo_url ? (
            <a
              href={company.demo_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--cobalt-lift)]"
            >
              Demo
            </a>
          ) : null}
          {company.deck_path ? (
            <span className="text-[var(--color-text-dim)]">Deck on file</span>
          ) : null}
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section>
          <SectionHead title="Updates" />
          <div className="space-y-5">
            {posts.map((post) => (
              <article key={post.id}>
                <div className="eyebrow mb-1">{relative(post.published_at)}</div>
                <h3 className="text-[17px] leading-tight text-[var(--cloud-white)]">
                  {post.title}
                </h3>
                <div className="prose-sepi mt-1.5 text-[14px]">
                  <Markdown>{post.body}</Markdown>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <Divider />
      <p className="text-[12px] text-[var(--color-text-dim)]">
        Started {relative(company.created_at)}.
      </p>
    </div>
  );
}
