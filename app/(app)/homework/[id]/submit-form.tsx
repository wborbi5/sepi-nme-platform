"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input, Textarea } from "@/components/ui";
import { submitAssignment } from "@/app/actions/homework";
import type { Assignment, AssignmentSubmission } from "@/lib/types";

export function SubmitForm({
  assignment,
  existing,
}: {
  assignment: Assignment;
  existing: AssignmentSubmission | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState(existing?.body ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitAssignment({
        assignmentId: assignment.id,
        body,
        url,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[#1e4b31] px-4 py-5">
        <p className="text-[15px] text-[var(--color-success)]">Turned in.</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          It is off your to-do list. You can come back and change it any time before it is
          approved.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/todo")}
        >
          Back to your to-do
        </Button>
      </div>
    );
  }

  const wantsLink = assignment.submit_kind === "link";

  return (
    <div className="space-y-4">
      {wantsLink ? (
        <Field
          label="Link"
          hint="A doc, a repo, a deck, a video — anywhere it lives."
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            placeholder="https://"
          />
        </Field>
      ) : null}

      <Field
        label={wantsLink ? "Anything to add" : "Your answer"}
        optional={wantsLink}
        hint={`${body.length}/4000`}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          className="min-h-[180px]"
          placeholder={assignment.submit_hint ?? undefined}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? "Turning in…" : existing ? "Turn in again" : "Turn it in"}
      </Button>
    </div>
  );
}
