"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveInternshipPlan } from "@/app/internships/actions";
import {
  COMPANY_SIZES,
  HELP_WANTED,
  SUMMER_END_GOALS,
  SUMMER_GOALS,
  formDataToRecord,
  parseInternshipPlan,
  type InternshipPlanFormValue,
} from "@/lib/internship-plan";

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";
const labelCls = "mb-1 block text-sm font-bold text-steel";

function CheckGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
}) {
  return (
    <fieldset>
      <legend className={labelCls}>{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border border-stone bg-paper px-4 text-base text-midnight"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="h-5 w-5 shrink-0 accent-navy"
              style={{ width: 20, height: 20, minHeight: 20 }}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function InternshipPlanForm({
  plan,
}: {
  plan: InternshipPlanFormValue;
}) {
  const router = useRouter();
  const [summerPlan, setSummerPlan] = useState(plan.summer_27_plan ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="mt-10 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setSaved(false);
        const form = event.currentTarget;
        const raw = formDataToRecord(new FormData(form));
        const parsed = parseInternshipPlan(raw);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        setBusy(true);
        try {
          const result = await saveInternshipPlan(new FormData(form));
          if (!result.ok) {
            setError(result.error);
            setBusy(false);
            return;
          }
          setSaved(true);
          setBusy(false);
          router.refresh();
        } catch {
          setError("Could not save your plan. Try again.");
          setBusy(false);
        }
      }}
    >
      <div>
        <label className={labelCls} htmlFor="summer_27_plan">
          Summer 2027
        </label>
        <select
          id="summer_27_plan"
          name="summer_27_plan"
          value={summerPlan}
          onChange={(event) => setSummerPlan(event.target.value)}
          className={inputCls}
        >
          <option value="">Not sure yet</option>
          {SUMMER_GOALS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={summerPlan === "other" ? "" : "hidden"}>
        <label className={labelCls} htmlFor="summer_27_plan_other">
          What’s the plan?
        </label>
        <input
          id="summer_27_plan_other"
          name="summer_27_plan_other"
          defaultValue={plan.summer_27_plan_other ?? ""}
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="preferred_location">
          Preferred location
        </label>
        <input
          id="preferred_location"
          name="preferred_location"
          defaultValue={plan.preferred_location ?? ""}
          placeholder="Chicago, NYC, remote"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="job_type">
          Role you’re interested in
        </label>
        <input
          id="job_type"
          name="job_type"
          defaultValue={plan.job_type ?? ""}
          placeholder="Product, SWE, investment banking"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="company_size">
          Company size
        </label>
        <select
          id="company_size"
          name="company_size"
          defaultValue={plan.company_size ?? ""}
          className={inputCls}
        >
          <option value="">Not sure yet</option>
          {COMPANY_SIZES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <CheckGroup
        legend="What you want by the end of the summer"
        name="summer_end_goals"
        options={SUMMER_END_GOALS}
        selected={plan.summer_end_goals}
      />

      <div>
        <label className={labelCls} htmlFor="brand_strengths">
          Where you’re already strong
        </label>
        <textarea
          id="brand_strengths"
          name="brand_strengths"
          rows={3}
          defaultValue={plan.brand_strengths ?? ""}
          placeholder="Grades, interviews, resume, proof of work"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="gaps">
          Gaps
        </label>
        <textarea
          id="gaps"
          name="gaps"
          rows={3}
          defaultValue={plan.gaps ?? ""}
          placeholder="Interviewing, networking, decisiveness, portfolio, cash"
          className={inputCls}
        />
      </div>

      <CheckGroup
        legend="Help you want from SEPi"
        name="help_wanted"
        options={HELP_WANTED}
        selected={plan.help_wanted}
      />

      <div>
        <label className={labelCls} htmlFor="notes">
          Notes <span className="font-semibold text-mist">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={plan.notes ?? ""}
          className={inputCls}
        />
      </div>

      {error ? (
        <p className="text-sm font-semibold text-[#b91c1c]" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm font-semibold text-[#15803d]" role="status">
          Saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="btn w-full rounded-full border-0 bg-navy px-6 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Saving…" : "Save plan"}
      </button>
    </form>
  );
}
