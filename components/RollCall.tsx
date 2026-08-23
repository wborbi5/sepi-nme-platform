"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import type { RollCallBoard, RollCallColumn } from "@/lib/data";
import {
  addGoal,
  clockIn,
  clockOut,
  removeGoal,
  toggleGoal,
} from "@/app/updates/rollcall-actions";
import {
  addDays,
  clockTime,
  dayNumber,
  longDate,
  shortDate,
  weekOf,
  weekdayInitial,
} from "@/lib/day";

/*
 * The Roll Call board. Goals toggle instantly through useOptimistic and
 * settle when the server action's revalidate lands, so a room full of
 * people tapping checkboxes never waits on a round trip.
 *
 * Past days render read-only. Clock-in exists only on today.
 */

type Action =
  | { type: "toggle"; goalId: string; done: boolean }
  | { type: "add"; profileId: string; name: string; slug: string | null; text: string }
  | { type: "remove"; goalId: string }
  | { type: "clockIn"; profileId: string; name: string; slug: string | null }
  | { type: "clockOut"; profileId: string };

function reduce(columns: RollCallColumn[], action: Action): RollCallColumn[] {
  switch (action.type) {
    case "toggle":
      return columns.map((c) => ({
        ...c,
        goals: c.goals.map((g) =>
          g.id === action.goalId ? { ...g, done: action.done } : g
        ),
      }));
    case "remove":
      return columns.map((c) => ({
        ...c,
        goals: c.goals.filter((g) => g.id !== action.goalId),
      }));
    case "add": {
      const goal = { id: `pending-${action.text}`, text: action.text, done: false };
      return upsertColumn(columns, action.profileId, action.name, action.slug, (c) => ({
        ...c,
        goals: [...c.goals, goal],
      }));
    }
    case "clockIn":
      return upsertColumn(columns, action.profileId, action.name, action.slug, (c) => ({
        ...c,
        checkin: {
          clockedInAt: new Date().toISOString(),
          clockedOutAt: null,
          location: "Elm",
        },
      }));
    case "clockOut":
      return columns.map((c) =>
        c.profileId === action.profileId && c.checkin
          ? { ...c, checkin: { ...c.checkin, clockedOutAt: new Date().toISOString() } }
          : c
      );
  }
}

function upsertColumn(
  columns: RollCallColumn[],
  profileId: string,
  name: string,
  slug: string | null,
  update: (c: RollCallColumn) => RollCallColumn
): RollCallColumn[] {
  if (columns.some((c) => c.profileId === profileId))
    return columns.map((c) => (c.profileId === profileId ? update(c) : c));
  return [
    update({ profileId, name, slug, goals: [], checkin: null }),
    ...columns,
  ];
}

function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
        done ? "border-navy bg-navy text-white" : "border-coolgray bg-paper"
      }`}
    >
      {done && (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M2 6.4 4.6 9 10 3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default function RollCall({
  board,
  viewerId,
  viewerName,
  viewerSlug,
  today,
}: {
  board: RollCallBoard;
  viewerId: string | null;
  viewerName: string;
  viewerSlug: string | null;
  today: string;
}) {
  const { day } = board;
  const [scope, setScope] = useState<"everyone" | "mine">("everyone");
  const [joined, setJoined] = useState(false);
  const [, startTransition] = useTransition();
  const [columns, applyOptimistic] = useOptimistic(board.columns, reduce);

  const isToday = day === today;
  const isPast = day < today;
  const editable = !isPast && Boolean(viewerId);
  const week = weekOf(day);

  const run = (action: Action, submit: () => Promise<void>) =>
    startTransition(async () => {
      applyOptimistic(action);
      await submit();
    });

  const mine = columns.find((c) => c.profileId === viewerId) ?? null;
  const shown = (scope === "mine" ? columns.filter((c) => c.profileId === viewerId) : columns).concat(
    // "+ Join today" reveals your column locally — an empty column is not
    // worth a database row until you put something in it.
    !mine && joined && viewerId
      ? [{ profileId: viewerId, name: viewerName, slug: viewerSlug, goals: [], checkin: null }]
      : []
  );

  const goals = columns.flatMap((c) => c.goals);
  const done = goals.filter((g) => g.done).length;

  const dayCell = (d: string) => {
    const selected = d === day;
    return (
      <Link
        key={d}
        href={`/updates?day=${d}`}
        scroll={false}
        aria-current={selected ? "date" : undefined}
        className={`flex min-h-[52px] flex-col items-center justify-center rounded-lg border text-center ${
          selected
            ? "border-navy bg-navy text-white"
            : "border-transparent text-midnight hover:border-coolgray"
        } ${d === today && !selected ? "font-extrabold text-oxford" : ""}`}
      >
        <span className={`text-[10px] uppercase ${selected ? "text-powder" : "text-steel"}`}>
          {weekdayInitial(d)}
        </span>
        <span className="text-[15px] font-bold leading-tight">{dayNumber(d)}</span>
      </Link>
    );
  };

  const arrow = (target: string, label: string, glyph: string) => (
    <Link
      href={`/updates?day=${target}`}
      scroll={false}
      aria-label={label}
      className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-xl text-steel hover:bg-cream-deep"
    >
      {glyph}
    </Link>
  );

  return (
    <section className="border-b border-stone pb-10">
      <header className="flex items-end justify-between gap-4 pt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-steel">
            {isToday ? "Today" : shortDate(day)}
          </p>
          <h2 className="display-serif mt-1 text-4xl leading-none sm:text-5xl">
            {longDate(day)}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="display-serif text-3xl leading-none sm:text-4xl">
            {done}/{goals.length}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-steel">
            Complete
          </p>
        </div>
      </header>

      <nav className="mt-5 flex items-center gap-1">
        {arrow(addDays(day, -1), "Previous day", "‹")}
        <div className="grid flex-1 grid-cols-7 gap-1">{week.map(dayCell)}</div>
        {arrow(addDays(day, 1), "Next day", "›")}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-coolgray bg-paper p-1">
          {(["everyone", "mine"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                scope === s ? "bg-navy text-white" : "text-steel"
              }`}
            >
              {s === "everyone" ? "Everyone" : "My day"}
            </button>
          ))}
        </div>
        {!isToday && (
          <Link
            href="/updates"
            scroll={false}
            className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-4 py-1.5 text-sm font-bold text-midnight"
          >
            Today
          </Link>
        )}
        {isPast && (
          <span className="text-sm font-semibold text-steel">Read-only</span>
        )}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-center text-slate-blue">
          {isPast ? "Nobody logged this day." : "Nobody has started the day yet."}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <Column
            key={c.profileId}
            column={c}
            isMine={c.profileId === viewerId}
            day={day}
            editable={editable}
            isToday={isToday}
            run={run}
          />
        ))}
      </div>

      {editable && !mine && !joined && (
        <p className="mt-6">
          <button
            type="button"
            onClick={() => setJoined(true)}
            className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-midnight hover:bg-cream-deep"
          >
            + Join {isToday ? "today" : longDate(day)}
          </button>
        </p>
      )}
    </section>
  );
}

function Column({
  column,
  isMine,
  day,
  editable,
  isToday,
  run,
}: {
  column: RollCallColumn;
  isMine: boolean;
  day: string;
  editable: boolean;
  isToday: boolean;
  run: (action: Action, submit: () => Promise<void>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const canEdit = isMine && editable;
  const doneCount = column.goals.filter((g) => g.done).length;
  const { checkin } = column;

  return (
    <article
      className={`rounded-xl border bg-paper p-4 ${
        isMine ? "border-navy" : "border-stone"
      }`}
    >
      <header className="flex items-baseline justify-between gap-2">
        {column.slug ? (
          <Link
            href={`/p/${column.slug}`}
            className="text-[15px] font-extrabold text-midnight hover:text-oxford"
          >
            {column.name}
          </Link>
        ) : (
          <span className="text-[15px] font-extrabold text-midnight">{column.name}</span>
        )}
        {column.goals.length > 0 && (
          <span className="shrink-0 text-xs font-bold text-steel">
            {doneCount}/{column.goals.length}
          </span>
        )}
      </header>

      {checkin && (
        <p className="mt-1 text-xs font-bold text-oxford">
          {checkin.clockedOutAt
            ? `${clockTime(checkin.clockedInAt)} – ${clockTime(checkin.clockedOutAt)} at ${checkin.location}`
            : `At ${checkin.location} since ${clockTime(checkin.clockedInAt)}`}
        </p>
      )}

      <ul className="mt-3">
        {column.goals.map((g) => (
          <li key={g.id} className="flex items-center gap-1 border-t border-stone first:border-t-0">
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("id", g.id);
                  fd.set("day", day);
                  fd.set("done", String(!g.done));
                  run({ type: "toggle", goalId: g.id, done: !g.done }, () => toggleGoal(fd));
                }}
                className="flex flex-1 items-center gap-2.5 py-2.5 text-left"
              >
                <Check done={g.done} />
                <span
                  className={`text-[15px] leading-6 ${
                    g.done ? "text-mist line-through" : "text-midnight"
                  }`}
                >
                  {g.text}
                </span>
              </button>
            ) : (
              <span className="flex flex-1 items-center gap-2.5 py-2.5">
                <Check done={g.done} />
                <span
                  className={`text-[15px] leading-6 ${
                    g.done ? "text-mist line-through" : "text-midnight"
                  }`}
                >
                  {g.text}
                </span>
              </span>
            )}
            {canEdit && (
              <button
                type="button"
                aria-label={`Remove goal: ${g.text}`}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("id", g.id);
                  fd.set("day", day);
                  run({ type: "remove", goalId: g.id }, () => removeGoal(fd));
                }}
                className="grid h-11 w-9 shrink-0 place-items-center text-lg text-mist hover:text-[#b91c1c]"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {column.goals.length === 0 && !canEdit && (
        <p className="mt-2 py-2 text-sm text-mist">Nothing logged yet.</p>
      )}

      {canEdit && (
        <form
          className="mt-1 border-t border-stone pt-1"
          action={(fd) => {
            const text = String(fd.get("text") ?? "").trim();
            if (!text) return;
            fd.set("day", day);
            input.current?.form?.reset();
            run(
              {
                type: "add",
                profileId: column.profileId,
                name: column.name,
                slug: column.slug,
                text,
              },
              () => addGoal(fd)
            );
          }}
        >
          <input
            ref={input}
            name="text"
            maxLength={140}
            required
            placeholder="Add a goal"
            aria-label="Add a goal"
            className="w-full bg-transparent px-1 py-2 text-[15px] text-midnight outline-none placeholder:text-mist"
          />
        </form>
      )}

      {isMine && isToday && (
        <div className="mt-3">
          {!checkin || checkin.clockedOutAt ? (
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("day", day);
                run(
                  {
                    type: "clockIn",
                    profileId: column.profileId,
                    name: column.name,
                    slug: column.slug,
                  },
                  () => clockIn(fd)
                );
              }}
              className="btn w-full rounded-full border-0 bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-oxford"
            >
              Clock in at Elm
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const fd = new FormData();
                fd.set("day", day);
                run({ type: "clockOut", profileId: column.profileId }, () => clockOut(fd));
              }}
              className="w-full py-2 text-xs font-bold uppercase tracking-[0.12em] text-steel hover:text-midnight"
            >
              Clock out
            </button>
          )}
        </div>
      )}
    </article>
  );
}
