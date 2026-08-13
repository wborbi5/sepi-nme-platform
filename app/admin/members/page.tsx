import Link from "next/link";

import { AdminHead, AdminPanel, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { dayMonth } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AllowedEmail, Profile } from "@/lib/types";

import { AllowlistForm, RemoveButton, RolePicker } from "./access-forms";

export const metadata = { title: "Members & access · Admin" };

export default async function AdminMembersPage() {
  await requireAdmin();

  const supabase = await createClient();
  // The allowlist is read with the service role: RLS restricts it to admins,
  // and this page is already behind three layers of admin checks.
  const admin = createAdminClient();

  const [{ data: allowRows }, { data: profileRows }] = await Promise.all([
    admin.from("allowed_emails").select("*").order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, slug, email, full_name, role, member_track, onboarded_at, is_active, created_at")
      .order("full_name"),
  ]);

  const allowlist = (allowRows as AllowedEmail[] | null) ?? [];
  const profiles =
    (profileRows as Pick<
      Profile,
      | "id"
      | "slug"
      | "email"
      | "full_name"
      | "role"
      | "member_track"
      | "onboarded_at"
      | "is_active"
      | "created_at"
    >[] | null) ?? [];

  const unclaimed = allowlist.filter((a) => !a.claimed_at);
  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "miamioh.edu";

  return (
    <div>
      <AdminHead
        title="Members & access"
        note="The allowlist is the only door into the app. An email that is not on it cannot create an account, even by hitting the auth endpoint directly."
      />

      <AdminPanel title="Add people">
        <AllowlistForm domain={domain} />
      </AdminPanel>

      <AdminPanel title={`Allowlist — ${allowlist.length} total, ${unclaimed.length} not signed up`}>
        <Table head={["Email", "Role", "Signed up", ""]}>
          {allowlist.map((entry) => (
            <Row key={entry.email}>
              <Cell className="font-mono text-[12px] text-[var(--cloud-white)]">
                {entry.email}
              </Cell>
              <Cell className="text-[var(--color-text-muted)]">{entry.role}</Cell>
              <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                {entry.claimed_at ? dayMonth(entry.claimed_at) : "—"}
              </Cell>
              <Cell>{entry.claimed_at ? null : <RemoveButton email={entry.email} />}</Cell>
            </Row>
          ))}
          {allowlist.length === 0 ? (
            <Row>
              <Cell className="text-[var(--color-text-dim)]">
                Nobody on the list. Nobody can sign in.
              </Cell>
            </Row>
          ) : null}
        </Table>
      </AdminPanel>

      <AdminPanel title={`Accounts — ${profiles.length}`}>
        <Table head={["Name", "Email", "Role", "Said they are", "Onboarded", ""]}>
          {profiles.map((p) => (
            <Row key={p.id}>
              <Cell className="text-[var(--cloud-white)]">{p.full_name ?? "—"}</Cell>
              <Cell className="font-mono text-[12px] text-[var(--color-text-dim)]">
                {p.email}
              </Cell>
              <Cell>
                <RolePicker profileId={p.id} role={p.role} />
              </Cell>
              <Cell className="text-[var(--color-text-dim)]">
                {p.member_track ?? "—"}
                {p.member_track &&
                ((p.member_track === "new" && p.role !== "new_member") ||
                  (p.member_track === "current" && p.role === "new_member")) ? (
                  <span className="ml-1 text-[var(--color-warning)]">⚠</span>
                ) : null}
              </Cell>
              <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
                {p.onboarded_at ? dayMonth(p.onboarded_at) : "not yet"}
              </Cell>
              <Cell>
                <Link href={`/p/${p.slug}`} className="text-[var(--cobalt-lift)]">
                  view
                </Link>
              </Cell>
            </Row>
          ))}
        </Table>
        <p className="mt-2 text-[12px] text-[var(--color-text-dim)]">
          ⚠ marks an account whose self-reported track disagrees with the role you granted.
        </p>
      </AdminPanel>
    </div>
  );
}
