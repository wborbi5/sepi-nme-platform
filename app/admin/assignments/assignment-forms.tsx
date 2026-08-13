"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { reviewSubmission, upsertAssignment } from "@/app/actions/admin";
import { AUDIENCE_LABEL, type Assignment } from "@/lib/types";

const SUBMIT_KINDS = [
  { value: "text", label: "Typed answer" },
  { value: "link", label: "A link" },
  { value: "file", label: "A file" },
  { value: "external", label: "An external form" },
  { value: "none", label: "Nothing to turn in" },
] as const;

export function AssignmentForm({ assignment }: { assignment?: Assignment }) {
  const router = useRouter();
  const [open, setOpen] = useState(!assignment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: assignment?.title ?? "",
    detail: assignment?.detail ?? "",
    weekNumber: assignment?.week_number ? String(assignment.week_number) : "",
    audience: assignment?.audience ?? "all",
    dueAt: assignment?.due_at ? assignment.due_at.slice(0, 16) : "",
    submitKind: assignment?.submit_kind ?? "text",
    submitHref: assignment?.submit_href ?? "",
    submitHint: assignment?.submit_hint ?? "",
    isPublished: assignment?.is_published ?? false,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await upsertAssignment({
        ...form,
        weekNumber: form.weekNumber || undefined,
        id: assignment?.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!assignment) {
        setForm({ ...form, title: "", detail: "", dueAt: "" });
      }
      setOpen(Boolean(assignment) ? false : true);
      router.refresh();
    });
  };

  if (assignment && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-0 text-[13px] text-[var(--cobalt-lift)]"
      >
        edit
      </button>
    );
  }

  return (
    <div className="max-w-[560px] space-y-3">
      <Field label="Title">
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
      </Field>

      <Field label="What to do" optional>
        <Textarea
          value={form.detail}
          onChange={(e) => set("detail", e.target.value)}
          maxLength={4000}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Week" optional>
          <Input
            value={form.weekNumber}
            onChange={(e) => set("weekNumber", e.target.value.replace(/[^1-7]/g, ""))}
            inputMode="numeric"
            maxLength={1}
          />
        </Field>
        <Field label="Due">
          <Input
            type="datetime-local"
            value={form.dueAt}
            onChange={(e) => set("dueAt", e.target.value)}
          />
        </Field>
        <Field label="Who">
          <Select
            value={form.audience}
            onChange={(e) => set("audience", e.target.value as Assignment["audience"])}
          >
            {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How they turn it in">
          <Select
            value={form.submitKind}
            onChange={(e) => set("submitKind", e.target.value as Assignment["submit_kind"])}
          >
            {SUBMIT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="External link"
          optional
          hint="Only for an external form. It becomes the to-do's destination."
        >
          <Input value={form.submitHref} onChange={(e) => set("submitHref", e.target.value)} />
        </Field>
      </div>

      <Field label="Hint on the to-do card" optional>
        <Input
          value={form.submitHint}
          onChange={(e) => set("submitHint", e.target.value)}
          maxLength={300}
          placeholder="Three sentences on what you learned talking to users."
        />
      </Field>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.isPublished}
          onChange={(e) => set("isPublished", e.target.checked)}
          className="h-[18px] min-h-0 w-[18px] accent-[var(--cobalt-lift)]"
        />
        <span className="text-[14px] text-[var(--cloud-white)]">
          Published — appears on people&apos;s to-do lists
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || !form.title.trim()}>
          {pending ? "Saving…" : assignment ? "Save" : "Create"}
        </Button>
        {assignment ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ReviewButtons({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [returning, setReturning] = useState(false);
  const [feedback, setFeedback] = useState("");

  const send = (status: "approved" | "returned") =>
    startTransition(async () => {
      await reviewSubmission({ submissionId, status, feedback });
      setReturning(false);
      setFeedback("");
      router.refresh();
    });

  if (returning) {
    return (
      <div className="space-y-2">
        <Input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What needs another pass?"
          maxLength={500}
          className="text-[13px]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send("returned")}
            disabled={pending}
            className="min-h-0 border border-[#5c4318] px-2 py-1 text-[12px] text-[var(--color-warning)]"
          >
            send back
          </button>
          <button
            type="button"
            onClick={() => setReturning(false)}
            className="min-h-0 text-[12px] text-[var(--color-text-dim)]"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => send("approved")}
        disabled={pending}
        className="min-h-0 border border-[#1e4b31] px-2 py-1 text-[12px] text-[var(--color-success)]"
      >
        approve
      </button>
      <button
        type="button"
        onClick={() => setReturning(true)}
        className="min-h-0 text-[12px] text-[var(--color-warning)]"
      >
        send back
      </button>
    </div>
  );
}
