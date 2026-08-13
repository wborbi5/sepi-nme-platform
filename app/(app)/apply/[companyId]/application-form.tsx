"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { saveApplicationDraft, submitApplication } from "@/app/actions/companies";
import { cn } from "@/lib/cn";
import {
  NO_VENTURE_QUESTIONS,
  QUESTIONS,
  SECTION_NOTE,
  SECTION_TITLE,
  type Question,
  type QuestionSection,
} from "@/lib/application-questions";

const SECTIONS: QuestionSection[] = [1, 2, 3];

export function ApplicationForm({
  companyId,
  passNumber,
  companyName,
  companyOneLiner,
  initialAnswers,
}: {
  companyId: string;
  passNumber: number;
  companyName: string;
  companyOneLiner: string;
  initialAnswers: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // The escape hatch. Half the cohort has no venture on day one, and without
  // this they invent answers — which makes the whole exercise worthless.
  const [noVenture, setNoVenture] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({
    company_name: companyName,
    one_liner: companyOneLiner,
    ...initialAnswers,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(answers);
  latest.current = answers;

  /** Debounced autosave. The local copy stays until the server confirms. */
  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      const result = await saveApplicationDraft({
        companyId,
        passNumber,
        answers: latest.current,
      });
      setSaveState(result.ok ? "saved" : "idle");
    }, 2000);
  }, [companyId, passNumber]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const set = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    scheduleSave();
  };

  const questions: Question[] =
    noVenture && passNumber === 1
      ? [...QUESTIONS.filter((q) => q.section === 1), ...NO_VENTURE_QUESTIONS]
      : QUESTIONS;

  const missing = questions.filter((q) => q.required && !answers[q.id]?.trim());

  const submit = () => {
    setError(null);
    if (timer.current) clearTimeout(timer.current);

    startTransition(async () => {
      const result = await submitApplication({ companyId, passNumber, answers });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/todo");
      router.refresh();
    });
  };

  return (
    <div className="space-y-9 pb-32">
      {passNumber === 1 ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-3.5">
          <input
            type="checkbox"
            checked={noVenture}
            onChange={(e) => setNoVenture(e.target.checked)}
            className="mt-0.5 h-[18px] min-h-0 w-[18px] shrink-0 accent-[var(--cobalt-lift)]"
          />
          <span>
            <span className="block text-[15px] text-[var(--cloud-white)]">
              No venture yet
            </span>
            <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--color-text-dim)]">
              Answer two short questions instead. The full form unlocks at pass 2. This is a
              real answer, not a cop-out.
            </span>
          </span>
        </label>
      ) : null}

      {SECTIONS.map((section) => {
        const sectionQuestions = questions.filter((q) => q.section === section);
        if (sectionQuestions.length === 0) return null;

        return (
          <section key={section}>
            <div className="mb-4 border-b border-[var(--color-border)] pb-3">
              <h2 className="text-[19px] leading-tight text-[var(--cloud-white)]">
                {SECTION_TITLE[section]}
              </h2>
              <p
                className={cn(
                  "mt-1 text-[13px]",
                  section === 2
                    ? "text-[var(--color-warning)]"
                    : "text-[var(--color-text-dim)]",
                )}
              >
                {section === 2 && noVenture
                  ? "Private. Only you, your big, and admins ever read this."
                  : SECTION_NOTE[section]}
              </p>
            </div>

            <div className="space-y-6">
              {sectionQuestions.map((q) => {
                const value = answers[q.id] ?? "";
                const over = q.maxLength ? value.length > q.maxLength : false;

                return (
                  <Field
                    key={q.id}
                    label={q.label}
                    optional={!q.required}
                    error={over ? `Over by ${value.length - (q.maxLength ?? 0)}.` : undefined}
                    hint={
                      q.maxLength
                        ? `${q.hint ? `${q.hint} · ` : ""}${value.length}/${q.maxLength}`
                        : q.hint
                    }
                  >
                    {q.multiline ? (
                      <Textarea
                        value={value}
                        onChange={(e) => set(q.id, e.target.value)}
                        maxLength={q.maxLength}
                        className={q.maxLength === 400 ? "min-h-[130px]" : "min-h-[110px]"}
                      />
                    ) : (
                      <Input
                        value={value}
                        onChange={(e) => set(q.id, e.target.value)}
                        maxLength={q.maxLength}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <Button
            onClick={submit}
            disabled={pending || missing.length > 0}
            className="flex-1"
          >
            {pending ? "Submitting…" : `Submit pass ${passNumber}`}
          </Button>
          <span className="w-[70px] shrink-0 text-right text-[12px] text-[var(--color-text-dim)]">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Draft saved" : ""}
          </span>
        </div>

        {missing.length > 0 ? (
          <p className="mt-2 text-[12px] text-[var(--color-text-dim)]">
            {missing.length} required {missing.length === 1 ? "answer" : "answers"} left.
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--color-text-dim)]">
            Submitting is permanent — passes are a record, not a draft.
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
