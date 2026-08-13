import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, LogoTile } from "@/components/avatar";
import { InvestEntry } from "@/components/invest-entry";
import { TodoList } from "@/components/todo-list";
import { Chip, Divider, Empty, SectionHead } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getCompaniesFor, getProfileBySlug, getSettings, getTodos } from "@/lib/data";
import { list, money } from "@/lib/format";
import { PUBLIC_HEADINGS, PUBLIC_KEYS } from "@/lib/application-questions";
import { relevanceFor, vibeLine } from "@/lib/relevance";
import { createClient } from "@/lib/supabase/server";
import { ENERGY_LABEL, type Profile } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  return { title: profile ? `${profile.full_name} · SEPi NME` : "Member · SEPi NME" };
}

const ROLE_WORD = {
  admin: "Admin",
  current_member: "Current member",
  new_member: "New member",
} as const;

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await requireProfile();
  const subject = await getProfileBySlug(slug);
  if (!subject) notFound();

  const isSelf = subject.id === viewer.id;
  const supabase = await createClient();

  const [companies, settings, todos, bigRes] = await Promise.all([
    getCompaniesFor(subject.id),
    getSettings(),
    isSelf ? getTodos(viewer.id) : Promise.resolve([]),
    subject.big_id
      ? supabase.from("profiles").select("slug, full_name, avatar_path").eq("id", subject.big_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const big = bigRes.data as Pick<Profile, "slug" | "full_name" | "avatar_path"> | null;

  const { data: littles } = await supabase
    .from("profiles")
    .select("slug, full_name, avatar_path")
    .eq("big_id", subject.id);

  const investableCompany = companies.find((c) => c.investable);

  const relevance = relevanceFor(subject, viewer, {
    subjectInvestable: Boolean(investableCompany),
  }).slice(0, 3);

  // The public half of the most recent application pass, per company.
  const { data: publicAnswers } = companies.length
    ? await supabase
        .from("application_public")
        .select("*")
        .in(
          "company_id",
          companies.map((c) => c.id),
        )
        .order("pass_number", { ascending: false })
    : { data: null };

  const answersByCompany = new Map<string, Record<string, unknown>>();
  for (const row of (publicAnswers ?? []) as Record<string, unknown>[]) {
    const id = row.company_id as string;
    if (!answersByCompany.has(id)) answersByCompany.set(id, row);
  }

  const canInvest =
    (viewer.role === "current_member" || viewer.role === "admin") &&
    Boolean(settings?.investment_window_open);

  return (
    <div className="space-y-9">
      {/* Identity. A circle, a name, and one sentence — nothing that looks like
          a control. */}
      <header>
        <div className="flex items-start gap-4">
          <Avatar name={subject.full_name} path={subject.avatar_path} size={72} ring />
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-[27px] leading-[1.1] text-[var(--cloud-white)]">
              {subject.full_name}
            </h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
              {ROLE_WORD[subject.role]}
              {subject.pronouns ? ` · ${subject.pronouns}` : ""}
              {subject.major ? ` · ${subject.major}` : ""}
              {subject.grad_year ? ` ’${String(subject.grad_year).slice(2)}` : ""}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[19px] leading-[1.35] text-[var(--cloud-white)]">
          {vibeLine(subject)}
        </p>

        {subject.energy && subject.headline ? (
          <p className="mt-1.5 text-[14px] text-[var(--color-text-muted)]">
            {ENERGY_LABEL[subject.energy]}.
          </p>
        ) : null}

        {isSelf ? (
          <Link
            href={`/p/${subject.slug}/edit`}
            className="mt-4 inline-block text-[13px] text-[var(--cobalt-lift)]"
          >
            Edit your profile →
          </Link>
        ) : null}
      </header>

      {/* Why you are looking at this person. Computed against *you*. */}
      {relevance.length > 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--ink-raised)] px-4 py-4">
          <div className="eyebrow mb-2.5">Between you two</div>
          <ul className="space-y-2">
            {relevance.map((r) => (
              <li
                key={r.id}
                className={
                  r.weight === "direct"
                    ? "text-[15px] leading-[1.45] text-[#a3b0ff]"
                    : "text-[14px] leading-[1.45] text-[var(--color-text-muted)]"
                }
              >
                {r.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Their words, as prose. */}
      <section className="space-y-6">
        {subject.currently ? (
          <Passage label="Right now" body={subject.currently} />
        ) : null}
        {subject.superpower ? (
          <Passage label="Unreasonably good at" body={subject.superpower} />
        ) : null}
        {subject.origin ? <Passage label="How they got here" body={subject.origin} /> : null}
        {subject.bio ? <Passage label="More" body={subject.bio} /> : null}

        {(subject.ask_me_about ?? []).length > 0 ? (
          <div>
            <div className="eyebrow mb-2">Ask them about</div>
            <ul className="flex flex-wrap gap-1.5">
              {subject.ask_me_about.map((item) => (
                <li key={item}>
                  <Chip tone="bright">{item}</Chip>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(subject.need_help_with ?? []).length > 0 ? (
          <div>
            <div className="eyebrow mb-2">
              {isSelf ? "You said you need" : "They are stuck on"}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {subject.need_help_with.map((item) => (
                <li key={item}>
                  <Chip>{item}</Chip>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(subject.working_style ?? []).length > 0 || subject.hometown ? (
          <p className="text-[13px] leading-[1.5] text-[var(--color-text-dim)]">
            {subject.hometown ? `From ${subject.hometown}. ` : ""}
            {(subject.working_style ?? []).length > 0
              ? `Works ${list(subject.working_style, 4)}.`
              : ""}
          </p>
        ) : null}

        {subject.fun_fact ? (
          <p className="border-l-2 border-[var(--color-border-strong)] pl-3 text-[14px] italic leading-[1.5] text-[var(--color-text-muted)]">
            {subject.fun_fact}
          </p>
        ) : null}
      </section>

      {/* Building. Logo, name, what it is — then the money, then the detail. */}
      <section>
        <SectionHead title={isSelf ? "What you are building" : "What they are building"} />

        {companies.length === 0 ? (
          <Empty>
            {isSelf ? (
              <>
                No company yet.{" "}
                <Link href="/companies/new" className="text-[var(--cobalt-lift)]">
                  Start one
                </Link>
                .
              </>
            ) : (
              "Nothing on the board yet."
            )}
          </Empty>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => {
              const answers = answersByCompany.get(company.id);
              return (
                <article
                  key={company.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--ink-raised)] p-4"
                >
                  <Link href={`/c/${company.slug}`} className="flex items-start gap-3">
                    <LogoTile name={company.name} path={company.logo_path} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-medium leading-tight text-[var(--cloud-white)]">
                        {company.name}
                      </div>
                      <div className="mt-0.5 text-[14px] text-[var(--color-text-muted)]">
                        {company.one_liner}
                      </div>
                      {company.role ? (
                        <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
                          {company.role}
                        </div>
                      ) : null}
                    </div>
                  </Link>

                  {company.investable ? (
                    <div className="mt-3.5 flex items-end gap-7 border-t border-[var(--color-border)] pt-3.5">
                      <div>
                        <div className="eyebrow">Raised</div>
                        <div className="figure mt-0.5 text-[22px] text-[var(--cloud-white)]">
                          {money(company.raised)}
                        </div>
                      </div>
                      <div>
                        <div className="eyebrow">Backers</div>
                        <div className="figure mt-0.5 text-[22px] text-[var(--cloud-white)]">
                          {company.backer_count}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {answers ? (
                    <dl className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
                      {PUBLIC_KEYS.map((key) => {
                        const value = answers[key];
                        if (!value || typeof value !== "string") return null;
                        return (
                          <div key={key}>
                            <dt className="eyebrow">{PUBLIC_HEADINGS[key]}</dt>
                            <dd className="mt-1 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
                              {value}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : null}

                  {/* Investing happens through people — so the door is here, on
                      the person's page, not only on a company directory row. */}
                  {!isSelf && company.investable && canInvest ? (
                    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                      <InvestEntry
                        company={{ id: company.id, name: company.name, slug: company.slug }}
                        founderName={subject.full_name ?? "them"}
                        min={settings?.investment_min ?? 10000}
                        max={settings?.investment_max ?? 100000}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Your own to-dos, on your own profile. Nobody else sees this. */}
      {isSelf ? (
        <section>
          <SectionHead
            title="Your to-do"
            action={
              todos.length > 4 ? (
                <Link href="/todo" className="text-[12px] text-[var(--cobalt-lift)]">
                  All {todos.length}
                </Link>
              ) : null
            }
          />
          <TodoList todos={todos} limit={4} />
        </section>
      ) : null}

      {/* Family and links, quiet at the bottom. */}
      {(big || (littles ?? []).length > 0 || subject.linkedin_url) ? (
        <>
          <Divider />
          <section className="space-y-3 text-[13px]">
            {big ? (
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <span className="eyebrow w-14 shrink-0">Big</span>
                <Link href={`/p/${big.slug}`} className="flex items-center gap-2">
                  <Avatar name={big.full_name} path={big.avatar_path} size={22} />
                  <span className="text-[var(--cloud-white)]">{big.full_name}</span>
                </Link>
              </div>
            ) : null}

            {(littles ?? []).length > 0 ? (
              <div className="flex items-start gap-2 text-[var(--color-text-muted)]">
                <span className="eyebrow w-14 shrink-0 pt-1">Littles</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {(littles as Pick<Profile, "slug" | "full_name" | "avatar_path">[]).map((l) => (
                    <Link key={l.slug} href={`/p/${l.slug}`} className="flex items-center gap-2">
                      <Avatar name={l.full_name} path={l.avatar_path} size={22} />
                      <span className="text-[var(--cloud-white)]">{l.full_name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {subject.linkedin_url ? (
              <div className="flex items-center gap-2">
                <span className="eyebrow w-14 shrink-0">LinkedIn</span>
                <a
                  href={subject.linkedin_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[var(--cobalt-lift)]"
                >
                  {subject.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

/** A labelled paragraph. The whole profile is made of these. */
function Passage({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <p className="text-[15px] leading-[1.55] text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}
