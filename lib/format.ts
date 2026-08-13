/** Money is integer dollars everywhere. No cents, no floats, no Decimal. */
export function money(dollars: number): string {
  return `$${dollars.toLocaleString("en-US")}`;
}

/** $85,000 -> $85k. For dense rows where the exact digits are one tap away. */
export function moneyShort(dollars: number): string {
  if (Math.abs(dollars) >= 1000 && dollars % 100 === 0) {
    const k = dollars / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return money(dollars);
}

const TZ = "America/New_York";

export function dayMonth(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
}

export function weekday(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", timeZone: TZ });
}

export function clockTime(iso: string | Date): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: TZ,
    })
    .toLowerCase()
    .replace(" ", "");
}

/** "Nov 2, 7:00pm" — the whole "where to go when" answer in one string. */
export function whenLabel(iso: string | Date): string {
  return `${dayMonth(iso)}, ${clockTime(iso)}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relative(iso: string | Date, now = Date.now()): string {
  const delta = new Date(iso).getTime() - now;
  const abs = Math.abs(delta);
  const past = delta < 0;

  if (abs < MINUTE) return "just now";
  if (abs < HOUR) {
    const n = Math.round(abs / MINUTE);
    return past ? `${n}m ago` : `in ${n}m`;
  }
  if (abs < DAY) {
    const n = Math.round(abs / HOUR);
    return past ? `${n}h ago` : `in ${n}h`;
  }
  if (abs < 7 * DAY) {
    const n = Math.round(abs / DAY);
    return past ? `${n}d ago` : `in ${n}d`;
  }
  return dayMonth(iso);
}

/**
 * Countdown that reads like a person said it. Used on 72-hour deadlines, which
 * are computed as an epoch offset — hence the number in the union.
 */
export function timeLeft(iso: string | Date | number, now = Date.now()): string {
  const delta = new Date(iso).getTime() - now;
  if (delta <= 0) return "overdue";
  if (delta < HOUR) return `${Math.max(1, Math.round(delta / MINUTE))} min left`;
  if (delta < DAY) return `${Math.round(delta / HOUR)} hours left`;
  return `${Math.round(delta / DAY)} days left`;
}

export function firstName(full: string | null | undefined): string {
  return full?.trim().split(/\s+/)[0] ?? "Member";
}

/** Oxford-comma join. "Ana, Ben, and Chi". */
export function list(items: string[], max = 3): string {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  const joined =
    shown.length <= 1
      ? (shown[0] ?? "")
      : shown.length === 2
        ? `${shown[0]} and ${shown[1]}`
        : `${shown.slice(0, -1).join(", ")}, and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${joined} +${rest}` : joined;
}
