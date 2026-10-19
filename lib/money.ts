/*
 * Hustle Sprint amounts are dollars and cents. Members type 12.50, $12.50,
 * or 1,234.50. Blank means zero so one of the two fields can be left empty.
 */

export type SprintAmount =
  | { ok: true; cents: number; amountText: string }
  | { ok: false; error: string };

function zeroAmount(): SprintAmount {
  return { ok: true, cents: 0, amountText: "0.00" };
}

export function parseSprintAmount(raw: unknown, label: string): SprintAmount {
  if (raw == null) return zeroAmount();
  if (typeof raw !== "string" && typeof raw !== "number") {
    return {
      ok: false,
      error: `${label} must be a number like 12.50. Dollar signs and commas are fine.`,
    };
  }

  const original = String(raw).trim();
  if (!original) return zeroAmount();

  let text = original.replace(/[\s$,]/g, "");
  if (text.startsWith("+")) text = text.slice(1);
  if (!text) {
    return {
      ok: false,
      error: `${label} must be a number like 12.50. Dollar signs and commas are fine.`,
    };
  }
  if (text.startsWith("-")) {
    return { ok: false, error: `${label} can't be negative.` };
  }
  if (!/^\d*\.?\d*$/.test(text) || text === ".") {
    return {
      ok: false,
      error: `${label} must be a number like 12.50. Dollar signs and commas are fine.`,
    };
  }

  const [wholeRaw, fracRaw] = text.split(".");
  let frac = fracRaw ?? "";
  if (frac.length > 2) {
    if (!/^0+$/.test(frac.slice(2))) {
      return {
        ok: false,
        error: `${label} can have at most 2 decimal places, like 12.50.`,
      };
    }
    frac = frac.slice(0, 2);
  }

  const whole = wholeRaw === "" ? "0" : wholeRaw;
  frac = frac.padEnd(2, "0");

  let cents: bigint;
  try {
    cents = BigInt(whole) * 100n + BigInt(frac);
  } catch {
    return {
      ok: false,
      error: `${label} must be a number like 12.50. Dollar signs and commas are fine.`,
    };
  }

  // numeric(12,2) tops out at 9,999,999,999.99
  if (cents > 999999999999n) {
    return { ok: false, error: `${label} is too large.` };
  }

  const amountText = `${(cents / 100n).toString()}.${(cents % 100n).toString().padStart(2, "0")}`;
  return { ok: true, cents: Number(cents), amountText };
}

export function formatSprintMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "$0.00";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
