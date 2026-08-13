import { AdminHead, AdminPanel, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { dayMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · Admin" };

type LogRow = {
  id: string;
  to_email: string;
  type: string;
  status: string;
  error: string | null;
  created_at: string;
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const supabase = await createClient();

  const { data: logRows } = await supabase
    .from("email_log")
    .select("id, to_email, type, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const log = (logRows as LogRow[] | null) ?? [];

  return (
    <div>
      <AdminHead title="Settings" />

      <AdminPanel title="Investment">
        {settings ? (
          <SettingsForm settings={settings} />
        ) : (
          <p className="text-[13px] text-[var(--color-danger)]">
            app_settings row is missing. Run migration 0001.
          </p>
        )}
      </AdminPanel>

      <AdminPanel title="Email delivery">
        <Table head={["When", "To", "Type", "Status", "Error"]}>
          {log.map((row) => (
            <Row key={row.id}>
              <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                {dayMonth(row.created_at)}
              </Cell>
              <Cell className="font-mono text-[12px] text-[var(--color-text-muted)]">
                {row.to_email}
              </Cell>
              <Cell className="text-[var(--color-text-muted)]">{row.type}</Cell>
              <Cell
                className={
                  row.status === "sent"
                    ? "text-[var(--color-success)]"
                    : row.status === "failed"
                      ? "text-[var(--color-danger)]"
                      : "text-[var(--color-text-dim)]"
                }
              >
                {row.status}
              </Cell>
              <Cell className="max-w-[280px] text-[var(--color-danger)]">{row.error}</Cell>
            </Row>
          ))}
          {log.length === 0 ? (
            <Row>
              <Cell className="text-[var(--color-text-dim)]">
                Nothing sent yet. A `skipped` row with &ldquo;RESEND_API_KEY not set&rdquo; means
                email is not configured.
              </Cell>
            </Row>
          ) : null}
        </Table>
      </AdminPanel>
    </div>
  );
}
