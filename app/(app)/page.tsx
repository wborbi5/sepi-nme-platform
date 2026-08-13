import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { PostCard } from "@/components/post-card";
import { TodoList } from "@/components/todo-list";
import { ButtonLink, Card, Empty, SectionHead } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getFeed, getSettings, getTodos } from "@/lib/data";
import { dayMonth, firstName, money, relative, whenLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CalEvent, Company, Investment, Profile, SprintEvent, SprintRow } from "@/lib/types";

export const metadata = { title: "Home · SEPi NME" };

type Backing = Investment & {
  investor: Pick<Profile, "full_name" | "slug" | "avatar_path"> | null;
  company: Pick<Company, "name" | "slug"> | null;
};

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [posts, todos, settings, nextEventRes, backingsRes, sprintRes] = await Promise.all([
    getFeed(profile.role),
    getTodos(profile.id),
    getSettings(),
    supabase
      .from("cal_events")
      .select("*")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date")
      .limit(1),
    supabase
      .from("investments")
      .select(
        "id, amount, note, status, created_at, investor_id, company_id, " +
          "investor:profiles!investments_investor_id_fkey(full_name, slug, avatar_path), " +
          "company:companies(name, slug)",
      )
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("sprint_events").select("*").eq("status", "open").limit(1),
  ]);

  const nextEvent = ((nextEventRes.data as CalEvent[] | null) ?? [])[0] ?? null;
  const backings = (backingsRes.data as unknown as Backing[] | null) ?? [];
  const sprint = ((sprintRes.data as SprintEvent[] | null) ?? [])[0] ?? null;

  let board: SprintRow[] = [];
  if (sprint) {
    const { data } = await supabase
      .from("sprint_leaderboard")
      .select("*")
      .eq("event_id", sprint.id)
      .order("score", { ascending: false })
      .limit(3);
    board = (data as SprintRow[] | null) ?? [];
  }

  const pressing = todos.filter((t) => t.urgency === "overdue" || t.urgency === "now");

  return (
    <div className="space-y-9">
      {/* Two facts and a name. No hero, no welcome paragraph. */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">
          {firstName(profile.full_name)}
        </h1>
        <div className="flex gap-7">
          {nextEvent ? (
            <div>
              <div className="eyebrow">Next up</div>
              <div className="text-[14px] font-medium text-[var(--cloud-white)]">
                {dayMonth(nextEvent.event_date)}
                {nextEvent.start_time ? ` · ${nextEvent.start_time.slice(0, 5)}` : ""}
              </div>
            </div>
          ) : null}
          {profile.role !== "new_member" && settings ? (
            <div>
              <div className="eyebrow">To deploy</div>
              <div className="text-[14px] font-medium text-[var(--cloud-white)]">
                <Balance profileId={profile.id} />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Alerts first. If something is owed, it outranks the feed. */}
      {pressing.length > 0 ? (
        <section>
          <SectionHead
            title="Needs you"
            action={
              todos.length > pressing.length ? (
                <Link href="/todo" className="text-[12px] text-[var(--cobalt-lift)]">
                  All {todos.length}
                </Link>
              ) : null
            }
          />
          <TodoList todos={pressing} limit={3} />
        </section>
      ) : null}

      {nextEvent ? (
        <Card className="px-4 py-4">
          <div className="eyebrow mb-1.5">
            {nextEvent.week_number ? `Week ${nextEvent.week_number}` : "Next session"}
          </div>
          <h2 className="text-[18px] leading-tight text-[var(--cloud-white)]">
            {nextEvent.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[var(--color-text-muted)]">
            <span>
              {dayMonth(nextEvent.event_date)}
              {nextEvent.start_time ? `, ${nextEvent.start_time.slice(0, 5)}` : ""}
            </span>
            {nextEvent.location ? <span>{nextEvent.location}</span> : null}
          </div>
        </Card>
      ) : null}

      {/* The feed. Admin-authored, chapter-wide. */}
      <section>
        <SectionHead
          title="Feed"
          action={
            profile.role === "admin" ? (
              <ButtonLink href="/admin/posts/new" variant="outline" className="h-9 min-h-0 px-3 text-[12px]">
                New post
              </ButtonLink>
            ) : null
          }
        />
        {posts.length === 0 ? (
          <Empty>Nothing posted yet.</Empty>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} admin={profile.role === "admin"} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-9 md:grid-cols-2">
        {/* Money moving. One line each — who, what, how much, and why. */}
        <section>
          <SectionHead
            title="Investments"
            action={
              <Link href="/updates" className="text-[12px] text-[var(--cobalt-lift)]">
                All activity
              </Link>
            }
          />
          {backings.length === 0 ? (
            <Empty>No investments yet.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {backings.map((b) => (
                <li key={b.id} className="py-3">
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      name={b.investor?.full_name}
                      path={b.investor?.avatar_path}
                      size={26}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-[1.4] text-[var(--color-text-muted)]">
                        <Link
                          href={`/p/${b.investor?.slug}`}
                          className="font-medium text-[var(--cloud-white)]"
                        >
                          {b.investor?.full_name ?? "A member"}
                        </Link>{" "}
                        backed{" "}
                        <Link
                          href={`/c/${b.company?.slug}`}
                          className="font-medium text-[var(--cloud-white)]"
                        >
                          {b.company?.name}
                        </Link>{" "}
                        for{" "}
                        <span className="font-medium text-[var(--cloud-white)] tabular-nums">
                          {money(b.amount)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[var(--color-text-dim)]">
                        “{b.note}”
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--color-text-dim)]">
                      {relative(b.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sprint board, top three. The whole board is one tap away. */}
        {sprint ? (
          <section>
            <SectionHead
              title="Money Sprint"
              action={
                <Link href="/sprint" className="text-[12px] text-[var(--cobalt-lift)]">
                  Full board
                </Link>
              }
            />
            {board.length === 0 ? (
              <Empty>Board is empty. Be first.</Empty>
            ) : (
              <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {board.map((row, i) => (
                  <li key={row.profile_id} className="flex items-center gap-3 py-3">
                    <span className="figure w-5 text-[15px] text-[var(--color-text-dim)]">
                      {i + 1}
                    </span>
                    <Avatar name={row.full_name} path={row.avatar_path} size={26} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--cloud-white)]">
                      {row.full_name}
                    </span>
                    <span className="figure text-[16px] text-[var(--cloud-white)]">
                      {money(Math.round(Number(row.score)))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {sprint.status === "open" ? (
              <ButtonLink href="/sprint" variant="outline" className="mt-3 w-full">
                Log your revenue
              </ButtonLink>
            ) : null}
          </section>
        ) : null}
      </div>

      {nextEvent?.description ? (
        <p className="text-[13px] text-[var(--color-text-dim)]">
          {whenLabel(`${nextEvent.event_date}T${nextEvent.start_time ?? "00:00:00"}`)} —{" "}
          {nextEvent.description}
        </p>
      ) : null}
    </div>
  );
}

/** Balance is a function call. There is no balance column, and never will be. */
async function Balance({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("available_balance", { investor: profileId });
  return <span className="tabular-nums">{money(Number(data ?? 0))}</span>;
}
