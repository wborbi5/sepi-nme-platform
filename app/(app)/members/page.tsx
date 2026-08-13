import Link from "next/link";

import { PROFILE_COLUMNS, requireProfile } from "@/lib/auth";
import { relevanceFor } from "@/lib/relevance";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

import { MembersList, type MemberRow } from "./members-list";

export const metadata = { title: "Members · SEPi NME" };

export default async function MembersPage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const [{ data: profiles }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("is_active", true)
      .order("full_name"),
    supabase.from("company_members").select("profile_id, companies(name, slug, logo_path)"),
  ]);

  const byProfile = new Map<string, MemberRow["companies"]>();
  for (const row of (memberships ?? []) as unknown as {
    profile_id: string;
    companies: { name: string; slug: string; logo_path: string | null } | null;
  }[]) {
    if (!row.companies) continue;
    const existing = byProfile.get(row.profile_id) ?? [];
    existing.push(row.companies);
    byProfile.set(row.profile_id, existing);
  }

  const members: MemberRow[] = ((profiles as Profile[] | null) ?? []).map((p) => {
    // Only the strongest line makes it into the list. The full set is on the
    // profile — the list is for deciding who to open.
    const top = relevanceFor(p, viewer).find((r) => r.weight === "direct");
    return {
      ...p,
      companies: byProfile.get(p.id) ?? [],
      connection: top?.text ?? null,
    };
  });

  const withOverlap = members.filter((m) => m.connection).length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Members</h1>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            {withOverlap > 0
              ? `${withOverlap} of them listed something you said you needed.`
              : "Search what people know, not just who they are."}
          </p>
        </div>
        <Link
          href="/ask"
          className="text-[13px] text-[var(--cobalt-lift)]"
        >
          Not sure who to ask? →
        </Link>
      </header>

      <MembersList members={members} />
    </div>
  );
}
