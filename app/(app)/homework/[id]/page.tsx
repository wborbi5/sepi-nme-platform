import Link from "next/link";
import { notFound } from "next/navigation";

import { Chip } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { relative, whenLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, AssignmentSubmission } from "@/lib/types";

import { SubmitForm } from "./submit-form";

export const metadata = { title: "Homework · SEPi NME" };

export default async function HomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
  const assignment = data as Assignment | null;
  if (!assignment) notFound();

  const { data: sub } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignment.id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  const existing = sub as AssignmentSubmission | null;
  const overdue = assignment.due_at ? new Date(assignment.due_at) < new Date() : false;

  return (
    <div className="mx-auto max-w-[620px]">
      <Link href="/todo" className="text-[13px] text-[var(--color-text-dim)]">
        ← To-do
      </Link>

      <header className="mt-3 border-b border-[var(--color-border)] pb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {assignment.week_number ? (
            <span className="eyebrow">Week {assignment.week_number}</span>
          ) : null}
          {assignment.due_at ? (
            <Chip tone={overdue ? "danger" : "warning"}>
              {overdue ? "Late" : `Due ${relative(assignment.due_at)}`}
            </Chip>
          ) : null}
          {existing ? (
            <Chip tone={existing.status === "returned" ? "warning" : "success"}>
              {existing.status === "approved"
                ? "Approved"
                : existing.status === "returned"
                  ? "Sent back"
                  : "Turned in"}
            </Chip>
          ) : null}
        </div>

        <h1 className="text-[26px] leading-[1.15] text-[var(--cloud-white)]">
          {assignment.title}
        </h1>

        {assignment.due_at ? (
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            Due {whenLabel(assignment.due_at)}
          </p>
        ) : null}
      </header>

      {assignment.detail ? (
        <p className="mt-5 whitespace-pre-line text-[15px] leading-[1.6] text-[var(--color-text-muted)]">
          {assignment.detail}
        </p>
      ) : null}

      {existing?.status === "returned" && existing.feedback ? (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[#5c4318] px-4 py-3">
          <div className="eyebrow mb-1 text-[var(--color-warning)]">Sent back</div>
          <p className="text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
            {existing.feedback}
          </p>
        </div>
      ) : null}

      {/* An external form still gets turned in here, so the to-do clears. */}
      {assignment.submit_kind === "external" && assignment.submit_href ? (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-4">
          <p className="text-[14px] text-[var(--color-text-muted)]">
            This one lives somewhere else.
          </p>
          <a
            href={assignment.submit_href}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex min-h-[var(--tap-min)] items-center rounded-[var(--radius)] bg-[var(--cloud-white)] px-4 text-[14px] font-medium text-[var(--midnight)]"
          >
            Open the form
          </a>
          <p className="mt-3 text-[12px] text-[var(--color-text-dim)]">
            Come back and mark it below so it leaves your to-do list.
          </p>
        </div>
      ) : null}

      <div className="mt-7">
        <SubmitForm assignment={assignment} existing={existing} />
      </div>
    </div>
  );
}
