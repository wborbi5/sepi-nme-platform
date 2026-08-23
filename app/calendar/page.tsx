import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { getNavSession, publicStorageUrl } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { today } from "@/lib/day";

export const metadata = { title: "Calendar — SEPi Portal" };

type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  location: string | null;
  description: string | null;
  week_number: number | null;
  calendar: "chapter" | "external";
  category: string | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "chapter", label: "SEPi Calendar" },
  { key: "external", label: "External Events" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/* The PDF legend, minus 'chapter' — the default needs no tag. */
const CATEGORY_TAG: Record<string, { label: string; className: string }> = {
  mandatory: { label: "Mandatory", className: "border-[#b91c1c] text-[#b91c1c]" },
  recruitment: { label: "Recruitment", className: "border-[#b45309] text-[#b45309]" },
  social: { label: "Social", className: "border-[#15803d] text-[#15803d]" },
  professional: { label: "Professional", className: "border-slate-blue text-slate-blue" },
  optional: { label: "Optional", className: "border-mist text-steel" },
};

function fmtTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

function fmtDay(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string }>;
}) {
  const { cal } = await searchParams;
  const filter: FilterKey =
    cal === "chapter" || cal === "external" ? cal : "all";

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

  const visible =
    filter === "all" ? events : events.filter((e) => e.calendar === filter);

  // A multi-day event stays upcoming until its final day is behind us.
  const now = today();
  const lastDay = (e: CalEvent) => e.end_date ?? e.event_date;
  const upcoming = visible.filter((e) => lastDay(e) >= now);
  const past = visible.filter((e) => lastDay(e) < now).reverse();

  // Group upcoming by NME week when set, else by month, groups in date order.
  const groups = new Map<string, CalEvent[]>();
  for (const e of upcoming) {
    const key =
      e.week_number != null
        ? `Week ${e.week_number}`
        : new Date(e.event_date + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const ordered = [...groups.entries()].sort(
    (a, b) => a[1][0].event_date.localeCompare(b[1][0].event_date)
  );

  const pdfs = [
    { label: "SEPi calendar", path: "sepi-calendar-fall-2026.pdf" },
    { label: "External events", path: "external-events-fall-2026.pdf" },
  ]
    .map((p) => ({ ...p, href: publicStorageUrl("calendar", p.path) }))
    .filter((p) => p.href);

  function EventRow({ e, dim }: { e: CalEvent; dim?: boolean }) {
    const tag = e.category ? CATEGORY_TAG[e.category] : undefined;
    const span = e.end_date && e.end_date !== e.event_date;
    return (
      <div className={`border-t border-stone py-4 ${dim ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-midnight">{e.title}</span>
            {e.calendar === "external" && (
              <span className="rounded-full border border-oxford px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-oxford">
                External
              </span>
            )}
            {tag && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${tag.className}`}
              >
                {tag.label}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold text-steel">
            {fmtDay(e.event_date)}
            {span ? ` – ${fmtDay(e.end_date!)}` : ""}
            {e.start_time && !span ? ` · ${fmtTime(e.start_time)}` : ""}
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
        <h1 className="display-serif pt-14 text-center text-6xl">Calendar</h1>

        {pdfs.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-center">
            {pdfs.map((p) => (
              <a
                key={p.path}
                href={p.href!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-oxford underline-offset-4 hover:underline"
              >
                View original PDF — {p.label}
              </a>
            ))}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-2 pb-6">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/calendar" : `/calendar?cal=${f.key}`}
              className={`btn inline-flex items-center rounded-full border px-5 py-2 text-sm font-bold ${
                filter === f.key
                  ? "border-navy bg-navy text-white"
                  : "border-coolgray bg-paper text-midnight hover:bg-cream-deep"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-center text-slate-blue">
            No sessions scheduled yet.
          </p>
        )}

        {ordered.map(([label, list]) => (
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
