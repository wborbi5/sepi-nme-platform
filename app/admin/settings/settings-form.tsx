"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input } from "@/components/ui";
import { updateSettings } from "@/app/actions/admin";
import { money } from "@/lib/format";
import type { AppSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [open, setOpen] = useState(settings.investment_window_open);
  const [min, setMin] = useState(String(settings.investment_min));
  const [max, setMax] = useState(String(settings.investment_max));
  const [budget, setBudget] = useState(String(settings.investor_budget));

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateSettings({
        investmentWindowOpen: open,
        investmentMin: min,
        investmentMax: max,
        investorBudget: budget,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Saved.");
      router.refresh();
    });
  };

  return (
    <div className="max-w-[460px] space-y-4">
      {/* The one switch that decides whether money can move at all. */}
      <div
        className={`border p-4 ${
          open ? "border-[#1e4b31]" : "border-[var(--color-border-strong)]"
        }`}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="mt-0.5 h-[18px] min-h-0 w-[18px] accent-[var(--color-success)]"
          />
          <span>
            <span className="block text-[15px] font-medium text-[var(--cloud-white)]">
              Investment window open
            </span>
            <span className="mt-0.5 block text-[13px] text-[var(--color-text-dim)]">
              Off means place_investment() rejects everything, whatever the dates say.
            </span>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum" hint={money(Number(min) || 0)}>
          <Input
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
          />
        </Field>
        <Field label="Maximum" hint={money(Number(max) || 0)}>
          <Input
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field
        label="Budget per investor"
        hint={`${money(Number(budget) || 0)} — changing this changes everyone's available balance immediately, because balance is computed, not stored.`}
      >
        <Input
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
        />
      </Field>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-[13px] text-[var(--color-success)]">{message}</p> : null}

      <Button onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
