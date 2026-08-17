"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NO_VENTURE_QUESTIONS,
  SECTIONS,
  type Question,
} from "@/lib/application-questions";
import { saveDraft, submitApplication } from "@/app/companies/[slug]/apply/actions";

/*
 * The Accelerator Application. Autosaves the draft ~2s after you stop
 * typing and keeps the local copy until the server confirms — nobody
 * loses a 400-character answer to a dropped connection.
 */

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";

function Field({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const over = q.maxLength ? value.length > q.maxLength : false;
  return (
    <div>
      <label className="mb-1 block text-[15px] font-bold leading-6 text-midnight" htmlFor={q.key}>
        {q.label}
        {q.required && <span className="text-[#b91c1c]"> *</span>}
        {q.maxLength && (
          <span className={`float-right text-sm font-normal ${over ? "text-[#b91c1c]" : "text-mist"}`}>
            {value.length}/{q.maxLength}
          </span>
        )}
      </label>
      {(q.rows ?? 1) === 1 ? (
        <input
          id={q.key}
          value={value}
          maxLength={q.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : (
        <textarea
          id={q.key}
          rows={q.rows}
          value={value}
          maxLength={q.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  );
}

export default function ApplicationForm({
  companyId,
  passNumber,
  initialAnswers,
}: {
  companyId: string;
  passNumber: number;
  initialAnswers: Record<string, string>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [noVenture, setNoVenture] = useState(initialAnswers.no_venture === "true");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ------------------------------------------------------------- autosave
  const scheduleSave = useCallback(
    (next: Record<string, string>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          await saveDraft(companyId, passNumber, next);
          setSaveState("saved");
        } catch {
          setSaveState("failed"); // local copy stays in state — nothing lost
        }
      }, 2000);
    },
    [companyId, passNumber]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("company_id", companyId);
      fd.set("pass_number", String(passNumber));
      fd.set("no_venture", String(noVenture));
      fd.set("answers_json", JSON.stringify(answers));
      await submitApplication(fd);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-stone bg-paper p-8 text-center">
        <p className="text-2xl font-extrabold text-midnight">
          Pass {passNumber} submitted.
        </p>
        <p className="mt-3 leading-7 text-slate-blue">
          It's permanent — passes are never overwritten. Your Section 3
          answers are now live on the company page.
        </p>
      </div>
    );
  }

  const questions = noVenture
    ? [{ id: "no-venture", title: "No venture yet", note: "Tell us where you'd start.", public: false, questions: NO_VENTURE_QUESTIONS }]
    : SECTIONS;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      {/* escape hatch — Pass 1 only */}
      {passNumber === 1 && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-stone bg-paper px-4 py-3">
          <input
            type="checkbox"
            checked={noVenture}
            onChange={(e) => setNoVenture(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-[15px] leading-6 text-midnight">
            <b>I don't have a venture yet.</b> Capture my interests and
            skills instead — the full application unlocks at Pass 2.
          </span>
        </label>
      )}

      {questions.map((section) => (
        <section key={section.id}>
          <h2 className="text-xl font-extrabold text-midnight">{section.title}</h2>
          {"note" in section && section.note && (
            <p className={`mt-1 text-sm ${section.public ? "text-[#15803d]" : "text-steel"}`}>
              {section.note}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-6">
            {section.questions.map((q) => (
              <Field
                key={q.key}
                q={q}
                value={answers[q.key] ?? ""}
                onChange={(v) => setAnswer(q.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {error && <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-4 border-t border-stone bg-cream px-6 py-4">
        <span className="text-sm text-steel" aria-live="polite">
          {saveState === "saving" && "Saving draft…"}
          {saveState === "saved" && "Draft saved ✓"}
          {saveState === "failed" && "Draft not saved — kept locally, will retry on next edit"}
        </span>
        <button
          type="submit"
          disabled={busy}
          className="btn rounded-full border-0 bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
        >
          {busy ? "Submitting…" : `Submit Pass ${passNumber}`}
        </button>
      </div>
    </form>
  );
}
