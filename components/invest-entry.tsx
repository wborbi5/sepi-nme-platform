"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { placeInvestment } from "@/app/actions/investments";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";

const COMMITMENTS = [
  "intro to someone",
  "weekly check-in",
  "review your deck",
  "sit in on a sales call",
  "hands-on help",
];

/**
 * A bottom sheet, not a centered modal. On November 2 this gets tapped on a
 * phone in a loud room — the controls belong under the thumb.
 */
export function InvestEntry({
  company,
  founderName,
  min,
  max,
  balance,
}: {
  company: { id: string; name: string; slug: string };
  founderName: string;
  min: number;
  max: number;
  balance?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const numeric = Number(amount.replace(/[^0-9]/g, ""));
  const ceiling = balance != null ? Math.min(max, balance) : max;

  // Mirrors the Postgres rules for instant feedback. place_investment() is
  // still the authority — this only decides whether the button looks tappable.
  const problem =
    !amount || Number.isNaN(numeric)
      ? "Enter an amount"
      : numeric < min
        ? `Minimum is ${money(min)}`
        : numeric > ceiling
          ? `You have ${money(ceiling)} left`
          : !note.trim()
            ? "Write why. That is the whole point."
            : null;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await placeInvestment({
        companyId: company.id,
        amount: numeric,
        note: note.trim(),
        commitmentTypes: types,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setAmount("");
      setNote("");
      setTypes([]);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="accent" className="w-full" onClick={() => setOpen(true)}>
        Back {company.name}
      </Button>
      <p className="mt-2 text-[12px] text-[var(--color-text-dim)]">
        {money(min)}–{money(max)}. {founderName} has 72 hours to respond.
      </p>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => setOpen(false)}
          className="absolute inset-0 h-full w-full bg-black/75"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Invest in ${company.name}`}
          className={cn(
            "absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[14px] border-t border-[var(--color-border-strong)] bg-[var(--ink-raised)] transition-transform duration-200 ease-out",
            "sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-lg)] sm:border",
            open ? "translate-y-0" : "translate-y-full sm:translate-y-[-45%]",
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-[var(--color-border-strong)] sm:hidden" />

          <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
            <div>
              <div className="eyebrow">Backing</div>
              <h2 className="mt-1 text-[21px] leading-tight text-[var(--cloud-white)]">
                {company.name}
              </h2>
              {balance != null ? (
                <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                  {money(balance)} available
                </p>
              ) : null}
            </div>

            <Field label="Amount">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                autoFocus
                placeholder={String(min)}
                className="figure text-[24px]"
              />
            </Field>

            <div className="flex gap-2">
              {[min, Math.round((min + ceiling) / 2 / 5000) * 5000, ceiling]
                .filter((v, i, arr) => v >= min && v <= ceiling && arr.indexOf(v) === i)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="min-h-0 flex-1 rounded-[var(--radius)] border border-[var(--color-border-strong)] py-2 text-[13px] text-[var(--color-text-muted)]"
                  >
                    {money(v)}
                  </button>
                ))}
            </div>

            <Field
              label="Why"
              hint="Required, and it shows publicly on their page. This is the feedback."
            >
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="The wedge is sharp and you already have three paying customers."
              />
            </Field>

            <div>
              <div className="mb-2 text-[13px] font-medium text-[var(--cloud-white)]">
                Also offering
                <span className="ml-1.5 text-[12px] font-normal text-[var(--color-text-dim)]">
                  optional
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMITMENTS.map((c) => {
                  const on = types.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTypes((prev) => (on ? prev.filter((t) => t !== c) : [...prev, c]))
                      }
                      className={cn(
                        "min-h-0 rounded-full border px-3 py-1.5 text-[12px]",
                        on
                          ? "border-[var(--cobalt-lift)] text-[#a3b0ff]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)]",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-[13px] text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="accent"
                className="flex-1"
                onClick={submit}
                disabled={pending || problem != null}
              >
                {pending
                  ? "Committing…"
                  : problem ?? `Commit ${money(numeric)}`}
              </Button>
            </div>

            <p className="text-[12px] leading-[1.5] text-[var(--color-text-dim)]">
              Funds lock the moment you commit. You cannot withdraw — only {founderName} can
              decline. No response in 72 hours accepts it automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
