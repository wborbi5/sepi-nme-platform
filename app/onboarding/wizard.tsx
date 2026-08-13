"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ChipsInput } from "@/components/chips-input";
import { Mark } from "@/components/mark";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ENERGY_OPTIONS, stepsFor, type OnboardingField } from "@/lib/onboarding";
import type { MemberTrack, Profile } from "@/lib/types";

import { finishOnboarding, saveOnboardingStep } from "./actions";

type Values = Record<string, unknown>;

function initialValues(profile: Profile): Values {
  return {
    member_track: profile.member_track ?? null,
    full_name: profile.full_name ?? "",
    pronouns: profile.pronouns ?? "",
    major: profile.major ?? "",
    grad_year: profile.grad_year ?? "",
    hometown: profile.hometown ?? "",
    currently: profile.currently ?? "",
    origin: profile.origin ?? "",
    energy: profile.energy ?? null,
    working_style: profile.working_style ?? [],
    ask_me_about: profile.ask_me_about ?? [],
    need_help_with: profile.need_help_with ?? [],
    headline: profile.headline ?? "",
    superpower: profile.superpower ?? "",
    fun_fact: profile.fun_fact ?? "",
  };
}

/** Where to drop someone who is coming back to a half-finished flow. */
function resumeIndex(profile: Profile, stepCount: number): number {
  if (!profile.member_track) return 0;
  if (!profile.full_name || !profile.major) return 1;
  if (!profile.currently) return 2;
  if (!profile.energy) return 3;
  if ((profile.ask_me_about ?? []).length === 0) return 4;
  return Math.min(5, stepCount - 1);
}

export function OnboardingWizard({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => initialValues(profile));
  const [index, setIndex] = useState(() => resumeIndex(profile, 6));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const steps = useMemo(
    () => stepsFor((values.member_track as MemberTrack | null) ?? null),
    [values.member_track],
  );

  // Track answer is step one; the branch decides the rest. Before it is
  // answered the flow is one step long, so show the real length of the
  // shortest branch instead of jumping the bar from 100% to 17%.
  const total = values.member_track ? steps.length : 6;
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = values.member_track != null && index === steps.length - 1;

  const set = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const missing = step.fields.filter((f) => {
    if (f.optional) return false;
    const v = values[f.name];
    if (Array.isArray(v)) return v.length === 0;
    return v == null || String(v).trim() === "";
  });

  const advance = () => {
    setError(null);
    const patch = Object.fromEntries(step.fields.map((f) => [f.name, values[f.name]]));

    startTransition(async () => {
      const result = isLast ? await finishOnboarding(patch) : await saveOnboardingStep(patch);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (isLast) {
        router.replace("/");
        router.refresh();
        return;
      }

      setIndex((i) => i + 1);
    });
  };

  const percent = Math.round(((index + (isLast ? 1 : 0)) / total) * 100);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Progress. Pinned, thin, always answers "how much is left". */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] px-5 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <Mark size={22} className="text-[var(--mist-blue)]" />
          <span className="text-[12px] tabular-nums text-[var(--color-text-dim)]">
            {Math.min(index + 1, total)} of {total}
          </span>
        </div>
        <div
          className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full rounded-full bg-[var(--cloud-white)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[440px] flex-1 px-5 pb-32 pt-9">
        <h1 className="text-[26px] leading-[1.15] text-[var(--cloud-white)]">{step.title}</h1>
        {step.caption ? (
          <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
            {step.caption}
          </p>
        ) : null}

        <div className="mt-7 space-y-5">
          {step.fields.map((field) => (
            <StepField
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(v) => set(field.name, v)}
              onPick={() => {
                // Choice cards submit themselves — one tap, not tap-then-next.
                if (field.type === "choice") setTimeout(advance, 120);
              }}
            />
          ))}
        </div>

        {error ? (
          <p role="alert" className="mt-5 text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>

      {/* Actions pinned to the thumb, not stranded at the bottom of the page. */}
      {step.fields[0]?.type !== "choice" ? (
        <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-[440px] items-center gap-3">
            {index > 0 ? (
              <Button variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={pending}>
                Back
              </Button>
            ) : null}
            <Button
              className="flex-1"
              onClick={advance}
              disabled={pending || missing.length > 0}
            >
              {pending ? "Saving…" : isLast ? "Go to SEPi" : "Next"}
            </Button>
          </div>
          {missing.length > 0 ? (
            <p className="mx-auto mt-2 max-w-[440px] text-[12px] text-[var(--color-text-dim)]">
              Still need: {missing.map((f) => f.label.toLowerCase()).join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- one field */

function StepField({
  field,
  value,
  onChange,
  onPick,
}: {
  field: OnboardingField;
  value: unknown;
  onChange: (v: unknown) => void;
  onPick: () => void;
}) {
  if (field.type === "choice" || field.type === "energy") {
    const options = field.type === "energy" ? ENERGY_OPTIONS : (field.options ?? []);
    return (
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-[var(--cloud-white)]">
          {field.label}
        </legend>
        <div className="space-y-2">
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onChange(option.value);
                  onPick();
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-[var(--cloud-white)] bg-[var(--ink-raised)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <span className="text-[15px] font-medium text-[var(--cloud-white)]">
                  {option.label}
                </span>
                {option.detail ? (
                  <span className="text-[13px] leading-[1.45] text-[var(--color-text-muted)]">
                    {option.detail}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.type === "chips") {
    return (
      <div>
        <div className="mb-1.5 text-[13px] font-medium text-[var(--cloud-white)]">
          {field.label}
        </div>
        <ChipsInput
          value={(value as string[]) ?? []}
          onChange={onChange}
          suggestions={field.suggestions}
        />
        {field.hint ? (
          <p className="mt-1.5 text-[12px] text-[var(--color-text-dim)]">{field.hint}</p>
        ) : null}
      </div>
    );
  }

  const count =
    field.maxLength && typeof value === "string"
      ? `${value.length}/${field.maxLength}`
      : undefined;

  return (
    <Field
      label={field.label}
      optional={field.optional}
      hint={count ? `${field.hint ? `${field.hint} · ` : ""}${count}` : field.hint}
    >
      {field.type === "textarea" ? (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
        />
      ) : (
        <Input
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
        />
      )}
    </Field>
  );
}
