/*
 * Plain-date helpers for Roll Call. The board is keyed on a calendar day
 * in Oxford, Ohio — never on the server's clock. Vercel runs UTC, so an
 * 8pm check-in would otherwise land on tomorrow's board.
 *
 * Every function takes and returns "YYYY-MM-DD" and does its arithmetic
 * in UTC, which is safe because the strings carry no time at all.
 */

export const CHAPTER_TZ = "America/New_York";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHAPTER_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Oxford, as YYYY-MM-DD. */
export function today(): string {
  return dayFormatter.format(new Date());
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Sunday-through-Saturday week containing `day`. */
export function weekOf(day: string): string[] {
  const [y, m, d] = day.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sunday = addDays(day, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/** Local-noon Date for display formatting — never crosses a day boundary. */
function asDate(day: string): Date {
  return new Date(`${day}T12:00:00`);
}

export function dayNumber(day: string): string {
  return String(Number(day.slice(8, 10)));
}

export function weekdayInitial(day: string): string {
  return asDate(day).toLocaleDateString("en-US", { weekday: "narrow" });
}

/** "August 17" */
export function longDate(day: string): string {
  return asDate(day).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** "Mon, Aug 17" */
export function shortDate(day: string): string {
  return asDate(day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** A timestamptz rendered as "8:58 AM" in Oxford. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CHAPTER_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}
