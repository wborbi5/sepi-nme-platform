import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { AskPanel } from "./ask-panel";

export const metadata = { title: "Ask · SEPi NME" };

type Row = {
  id: string;
  role: "user" | "assistant";
  body: string;
  refs: string[];
};

export default async function AskPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("chat_messages")
    .select("id, role, body, refs")
    .eq("profile_id", profile.id)
    .order("created_at")
    .limit(40);

  const rows = (history as Row[] | null) ?? [];

  // Resolve stored member ids to names once, server-side, so the client never
  // has to hold the roster.
  const ids = [...new Set(rows.flatMap((r) => r.refs))];
  const { data: refProfiles } = ids.length
    ? await supabase.from("profiles").select("id, slug, full_name").in("id", ids)
    : { data: [] };

  const byId = new Map(
    ((refProfiles ?? []) as { id: string; slug: string | null; full_name: string | null }[]).map(
      (p) => [p.id, { slug: p.slug ?? "", name: p.full_name ?? "Member" }],
    ),
  );

  const initial = rows.map((r) => ({
    id: r.id,
    role: r.role,
    body: r.body,
    refs: r.refs.map((id) => byId.get(id)).filter((v): v is { slug: string; name: string } => Boolean(v)),
  }));

  return (
    <div>
      <header className="mb-6 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Ask</h1>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Who in this chapter knows the thing you are stuck on.
        </p>
      </header>

      <AskPanel initial={initial} />
    </div>
  );
}
