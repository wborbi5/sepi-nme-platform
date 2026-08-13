import { Empty } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CalEvent } from "@/lib/types";

export const metadata = { title: "Calendar · SEPi NME" };

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

export default async function CalendarPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase.from("cal_events").select("*").order("event_date");
  const events = (data as CalEvent[] | null) ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).reverse();

  return (
    <div>
      <header className="mb-6 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Calendar</h1>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Where to be, and when.
        </p>
      </header>

      {upcoming.length === 0 && past.length === 0 ? (
        <Empty>Nothing scheduled yet.</Empty>
      ) : null}

      {upcoming.length > 0 ? <EventList events={upcoming} /> : null}

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
            Done
          </h2>
          <EventList events={past} dim />
        </section>
      ) : null}
    </div>
  );
}

function EventList({ events, dim }: { events: CalEvent[]; dim?: boolean }) {
  return (
    <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {events.map((event) => {
        const d = dayLabel(event.event_date);
        return (
          <li key={event.id} className={`flex gap-4 py-4 ${dim ? "opacity-45" : ""}`}>
            {/* The date block is the anchor — big, tabular, unmissable. */}
            <div className="w-[46px] shrink-0 text-center">
              <div className="eyebrow leading-none">{d.weekday}</div>
              <div className="figure mt-1 text-[24px] text-[var(--cloud-white)]">{d.day}</div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
                {d.month}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {event.week_number ? (
                <div className="eyebrow mb-0.5">Week {event.week_number}</div>
              ) : null}
              <div className="text-[16px] font-medium leading-tight text-[var(--cloud-white)]">
                {event.title}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-[var(--color-text-muted)]">
                {event.start_time ? <span>{event.start_time.slice(0, 5)}</span> : null}
                {event.location ? <span>{event.location}</span> : null}
              </div>
              {event.description ? (
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--color-text-dim)]">
                  {event.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
