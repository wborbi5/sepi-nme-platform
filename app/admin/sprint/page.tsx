import { AdminHead, AdminPanel, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { dayMonth, money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SprintEvent } from "@/lib/types";

import { SprintReviewButtons } from "./review-buttons";

export const metadata = { title: "Sprint review · Admin" };

type EntryRow = {
  id: string;
  amount_delivered: number;
  amount_pre_service: number;
  description: string | null;
  proof_path: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  team: string | null;
  profiles: Pick<Profile, "full_name" | "email"> | null;
};

export default async function AdminSprintPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: eventRows } = await supabase
    .from("sprint_events")
    .select("*")
    .order("started_at", { ascending: false, nullsFirst: false });

  const events = (eventRows as SprintEvent[] | null) ?? [];
  const active = events.find((e) => e.status === "open") ?? events[0] ?? null;

  const { data: entryRows } = active
    ? await supabase
        .from("sprint_entries")
        .select(
          "id, amount_delivered, amount_pre_service, description, proof_path, status, submitted_at, team, profiles(full_name, email)",
        )
        .eq("event_id", active.id)
        .order("submitted_at", { ascending: false })
    : { data: null };

  const entries = (entryRows as unknown as EntryRow[] | null) ?? [];
  const pending = entries.filter((e) => e.status === "pending");
  const resolved = entries.filter((e) => e.status !== "pending");

  // The sprint bucket is owner + admin, not public — proof photos need a signed
  // URL. Minting them here keeps the bytes out of any function on the way back.
  const proofUrls = new Map<string, string>();
  const withProof = pending.filter((e) => e.proof_path);
  if (withProof.length > 0) {
    const { data: signed } = await supabase.storage
      .from("sprint")
      .createSignedUrls(
        withProof.map((e) => e.proof_path as string),
        600,
      );
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) proofUrls.set(item.path, item.signedUrl);
    }
  }

  return (
    <div>
      <AdminHead
        title="Sprint review"
        note="Only approved entries count toward the board."
      />

      {!active ? (
        <p className="text-[13px] text-[var(--color-text-dim)]">
          No sprint event exists. Create one directly in the database — this is a once-a-term
          operation and does not need a form.
        </p>
      ) : (
        <>
          <AdminPanel title={`${active.name} — ${active.status}, ${active.multiplier}x pre-service`}>
            <p className="text-[13px] text-[var(--color-text-dim)]">
              {entries.length} submissions · {pending.length} waiting
            </p>
          </AdminPanel>

          <AdminPanel title={`Waiting — ${pending.length}`}>
            {pending.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-dim)]">Nothing waiting.</p>
            ) : (
              <Table
                head={["Member", "Delivered", "Pre-service", "What", "Proof", "When", ""]}
              >
                {pending.map((e) => (
                  <Row key={e.id}>
                    <Cell className="whitespace-nowrap text-[var(--cloud-white)]">
                      {e.profiles?.full_name ?? e.profiles?.email}
                    </Cell>
                    <Cell className="tabular-nums text-[var(--cloud-white)]">
                      {money(e.amount_delivered)}
                    </Cell>
                    <Cell className="tabular-nums text-[var(--color-text-muted)]">
                      {money(e.amount_pre_service)}
                    </Cell>
                    <Cell className="max-w-[300px] text-[var(--color-text-muted)]">
                      {e.description}
                    </Cell>
                    <Cell>
                      {e.proof_path && proofUrls.get(e.proof_path) ? (
                        <a
                          href={proofUrls.get(e.proof_path)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[var(--cobalt-lift)]"
                        >
                          open
                        </a>
                      ) : (
                        <span className="text-[var(--color-text-dim)]">none</span>
                      )}
                    </Cell>
                    <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                      {dayMonth(e.submitted_at)}
                    </Cell>
                    <Cell>
                      <SprintReviewButtons entryId={e.id} />
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </AdminPanel>

          <AdminPanel title={`Resolved — ${resolved.length}`}>
            <Table head={["Member", "Delivered", "Pre-service", "Status", "When"]}>
              {resolved.map((e) => (
                <Row key={e.id}>
                  <Cell className="text-[var(--cloud-white)]">
                    {e.profiles?.full_name ?? e.profiles?.email}
                  </Cell>
                  <Cell className="tabular-nums text-[var(--color-text-muted)]">
                    {money(e.amount_delivered)}
                  </Cell>
                  <Cell className="tabular-nums text-[var(--color-text-muted)]">
                    {money(e.amount_pre_service)}
                  </Cell>
                  <Cell
                    className={
                      e.status === "approved"
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-danger)]"
                    }
                  >
                    {e.status}
                  </Cell>
                  <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                    {dayMonth(e.submitted_at)}
                  </Cell>
                </Row>
              ))}
              {resolved.length === 0 ? (
                <Row>
                  <Cell className="text-[var(--color-text-dim)]">Nothing resolved yet.</Cell>
                </Row>
              ) : null}
            </Table>
          </AdminPanel>
        </>
      )}
    </div>
  );
}
