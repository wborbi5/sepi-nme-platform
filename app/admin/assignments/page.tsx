import { AdminHead, AdminPanel, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { dayMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, AssignmentSubmission, Profile } from "@/lib/types";

import { AssignmentForm, ReviewButtons } from "./assignment-forms";

export const metadata = { title: "Assignments · Admin" };

type SubmissionRow = AssignmentSubmission & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  assignments: Pick<Assignment, "title"> | null;
};

export default async function AdminAssignmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: assignmentRows }, { data: submissionRows }, { data: counts }] =
    await Promise.all([
      supabase.from("assignments").select("*").order("week_number", { nullsFirst: false }),
      supabase
        .from("assignment_submissions")
        .select("*, profiles(full_name, email), assignments(title)")
        .eq("status", "submitted")
        .order("submitted_at"),
      supabase.from("assignment_submissions").select("assignment_id, status"),
    ]);

  const assignments = (assignmentRows as Assignment[] | null) ?? [];
  const pending = (submissionRows as unknown as SubmissionRow[] | null) ?? [];
  const all = (counts as { assignment_id: string; status: string }[] | null) ?? [];

  const turnedIn = (id: string) => all.filter((s) => s.assignment_id === id).length;

  return (
    <div>
      <AdminHead
        title="Assignments"
        note="A published assignment appears on every matching member's to-do list until they turn it in."
      />

      <AdminPanel title="New assignment">
        <AssignmentForm />
      </AdminPanel>

      <AdminPanel title={`To review — ${pending.length}`}>
        {pending.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-dim)]">Nothing waiting.</p>
        ) : (
          <Table head={["Member", "Assignment", "What they turned in", "When", ""]}>
            {pending.map((s) => (
              <Row key={s.id}>
                <Cell className="whitespace-nowrap text-[var(--cloud-white)]">
                  {s.profiles?.full_name ?? s.profiles?.email}
                </Cell>
                <Cell className="text-[var(--color-text-muted)]">{s.assignments?.title}</Cell>
                <Cell className="max-w-[380px] text-[var(--color-text-muted)]">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate text-[var(--cobalt-lift)]"
                    >
                      {s.url}
                    </a>
                  ) : null}
                  {s.body ? (
                    <span className="line-clamp-3 whitespace-pre-line">{s.body}</span>
                  ) : null}
                </Cell>
                <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                  {dayMonth(s.submitted_at)}
                </Cell>
                <Cell>
                  <ReviewButtons submissionId={s.id} />
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </AdminPanel>

      <AdminPanel title={`All assignments — ${assignments.length}`}>
        <Table head={["Wk", "Title", "Who", "Due", "Published", "Turned in", ""]}>
          {assignments.map((a) => (
            <Row key={a.id}>
              <Cell className="text-[var(--color-text-dim)]">{a.week_number ?? "—"}</Cell>
              <Cell className="text-[var(--cloud-white)]">{a.title}</Cell>
              <Cell className="text-[var(--color-text-dim)]">{a.audience}</Cell>
              <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                {a.due_at ? dayMonth(a.due_at) : "—"}
              </Cell>
              <Cell
                className={
                  a.is_published ? "text-[var(--color-success)]" : "text-[var(--color-text-dim)]"
                }
              >
                {a.is_published ? "live" : "draft"}
              </Cell>
              <Cell className="tabular-nums text-[var(--color-text-muted)]">
                {turnedIn(a.id)}
              </Cell>
              <Cell>
                <AssignmentForm assignment={a} />
              </Cell>
            </Row>
          ))}
          {assignments.length === 0 ? (
            <Row>
              <Cell className="text-[var(--color-text-dim)]">None yet.</Cell>
            </Row>
          ) : null}
        </Table>
      </AdminPanel>
    </div>
  );
}
