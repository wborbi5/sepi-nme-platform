import { Avatar } from "@/components/avatar";
import { Chip, Empty, SectionHead } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SprintEvent, SprintRow } from "@/lib/types";

import { SprintForm } from "./sprint-form";

export const metadata = { title: "Money Sprint · SEPi NME" };

const TEAMS = ["wyatt", "madison"] as const;

export default async function SprintPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: eventRows } = await supabase
    .from("sprint_events")
    .select("*")
    .neq("status", "draft")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const event = ((eventRows as SprintEvent[] | null) ?? [])[0] ?? null;

  if (!event) {
    return (
      <div>
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Money Sprint</h1>
        <div className="mt-6">
          <Empty>No sprint running. The board appears when one opens.</Empty>
        </div>
      </div>
    );
  }

  const [{ data: boardRows }, { data: mine }] = await Promise.all([
    supabase
      .from("sprint_leaderboard")
      .select("*")
      .eq("event_id", event.id)
      .order("score", { ascending: false }),
    supabase
      .from("sprint_entries")
      .select("id, status, amount_delivered, amount_pre_service, reject_reason")
      .eq("event_id", event.id)
      .eq("profile_id", profile.id)
      .order("submitted_at", { ascending: false }),
  ]);

  const board = (boardRows as SprintRow[] | null) ?? [];
  const entries =
    (mine as
      | {
          id: string;
          status: "pending" | "approved" | "rejected";
          amount_delivered: number;
          amount_pre_service: number;
          reject_reason: string | null;
        }[]
      | null) ?? [];

  const teamTotal = (team: string) =>
    board.filter((r) => r.team === team).reduce((sum, r) => sum + Number(r.score), 0);

  const chapterTotal = board.reduce((sum, r) => sum + Number(r.score), 0);

  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">{event.name}</h1>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            Delivered + pre-service × {event.multiplier}. Approved entries only.
          </p>
        </div>
        <div>
          <div className="eyebrow">Chapter total</div>
          <div className="figure mt-0.5 text-[28px] text-[var(--cloud-white)]">
            {money(Math.round(chapterTotal))}
          </div>
        </div>
      </header>

      {/* Teams. Two numbers, side by side, nothing else. */}
      <section className="grid grid-cols-2 gap-4">
        {TEAMS.map((team) => {
          const total = Math.round(teamTotal(team));
          const other = Math.round(teamTotal(team === "wyatt" ? "madison" : "wyatt"));
          const leading = total > other;
          return (
            <div
              key={team}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--ink-raised)] px-4 py-4"
            >
              <div className="eyebrow capitalize">Team {team}</div>
              <div
                className={`figure mt-1 text-[26px] ${
                  leading ? "text-[var(--cloud-white)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {money(total)}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <SectionHead title="Leaderboard" />
        {board.length === 0 ? (
          <Empty>Nothing approved yet.</Empty>
        ) : (
          <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {board.map((row, i) => (
              <li
                key={row.profile_id}
                className={`flex items-center gap-3 py-3 ${
                  row.profile_id === profile.id ? "bg-[var(--ink-raised)]" : ""
                }`}
              >
                <span className="figure w-6 shrink-0 text-[15px] text-[var(--color-text-dim)]">
                  {i + 1}
                </span>
                <Avatar name={row.full_name} path={row.avatar_path} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] text-[var(--cloud-white)]">
                    {row.full_name}
                    {row.profile_id === profile.id ? (
                      <span className="ml-2 text-[11px] text-[var(--color-text-dim)]">you</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-dim)]">
                    {money(row.delivered)} delivered · {money(row.pre_service)} pre-service
                  </div>
                </div>
                <span className="figure shrink-0 text-[17px] text-[var(--cloud-white)]">
                  {money(Math.round(Number(row.score)))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {event.status === "open" ? (
        <section>
          <SectionHead title="Log revenue" />
          <SprintForm
            eventId={event.id}
            profileId={profile.id}
            multiplier={Number(event.multiplier)}
          />
        </section>
      ) : (
        <p className="text-[13px] text-[var(--color-text-dim)]">This sprint is closed.</p>
      )}

      {entries.length > 0 ? (
        <section>
          <SectionHead title="Your submissions" />
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="text-[14px] text-[var(--cloud-white)]">
                    {money(e.amount_delivered)} + {money(e.amount_pre_service)} pre-service
                  </div>
                  {e.reject_reason ? (
                    <div className="mt-0.5 text-[12px] text-[var(--color-danger)]">
                      {e.reject_reason}
                    </div>
                  ) : null}
                </div>
                <Chip
                  tone={
                    e.status === "approved"
                      ? "success"
                      : e.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {e.status}
                </Chip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
