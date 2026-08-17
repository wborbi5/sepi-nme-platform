import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Calendar — SEPi Portal" };

type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  description: string | null;
  week_number: number | null;
};

function fmtTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export default async function CalendarPage() {
  const nav = await getNavSession();
  let events: CalEvent[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cal_events")
      .select("*")
      .order("event_date")
      .order("start_time");
    events = (data as CalEvent[]) ?? [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).reverse();

  // Group upcoming by week number when set, else by month
  const groups = new Map<string, CalEvent[]>();
  for (const e of upcoming) {
    const key =
      e.week_number != null
        ? `Week ${e.week_number}`
        : new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  function EventRow({ e, dim }: { e: CalEvent; dim?: boolean }) {
    return (
      <div className={`border-t border-stone py-4 ${dim ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-midnight">{e.title}</span>
          <span className="text-sm font-semibold text-steel">
            {new Date(e.event_date + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {e.start_time ? ` · ${fmtTime(e.start_time)}` : ""}
          </span>
        </div>
        {(e.location || e.description) && (
          <p className="mt-1 text-[15px] leading-6 text-slate-blue">
            {[e.location, e.description].filter(Boolean).join(" — ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-2xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-6xl">Calendar</h1>

        {events.length === 0 && (
          <p className="text-center text-slate-blue">
            No sessions scheduled yet.
          </p>
        )}

        {[...groups.entries()].map(([label, list]) => (
          <section key={label} className="mb-10">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">
              {label}
            </h2>
            {list.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </section>
        ))}

        {past.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-mist">
              Past
            </h2>
            {past.map((e) => (
              <EventRow key={e.id} e={e} dim />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
