import Link from "next/link";
import Markdown from "react-markdown";

import { Avatar, LogoTile } from "@/components/avatar";
import { Empty } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { money, relative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Company, Investment, Post, Profile } from "@/lib/types";

export const metadata = { title: "Activity · SEPi NME" };

type PostRow = Post & {
  author: Pick<Profile, "slug" | "full_name" | "avatar_path"> | null;
  company: Pick<Company, "name" | "slug" | "logo_path"> | null;
};

type InvestmentRow = Investment & {
  investor: Pick<Profile, "slug" | "full_name" | "avatar_path"> | null;
  company: Pick<Company, "name" | "slug"> | null;
};

type Item =
  | { kind: "post"; at: string; post: PostRow }
  | { kind: "investment"; at: string; investment: InvestmentRow };

/**
 * Two streams merged by timestamp: founder-written company updates in full, and
 * investment events as one line. Money Sprint deliberately does not appear —
 * it has its own board.
 */
export default async function UpdatesPage() {
  await requireProfile();
  const supabase = await createClient();

  const [{ data: postRows }, { data: investmentRows }] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "*, author:profiles!posts_author_id_fkey(slug, full_name, avatar_path), company:companies(name, slug, logo_path)",
      )
      .not("company_id", "is", null)
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("investments")
      .select(
        "*, investor:profiles!investments_investor_id_fkey(slug, full_name, avatar_path), company:companies(name, slug)",
      )
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const items: Item[] = [
    ...(((postRows as unknown as PostRow[] | null) ?? []).map((post) => ({
      kind: "post" as const,
      at: post.published_at,
      post,
    })) ),
    ...(((investmentRows as unknown as InvestmentRow[] | null) ?? []).map((investment) => ({
      kind: "investment" as const,
      at: investment.responded_at ?? investment.created_at,
      investment,
    })) ),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div>
      <header className="mb-6 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Activity</h1>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Company updates and money moving.
        </p>
      </header>

      {items.length === 0 ? (
        <Empty>Nothing has happened yet.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {items.map((item) =>
            item.kind === "post" ? (
              <li key={`p-${item.post.id}`} className="py-5">
                <div className="mb-1.5 flex items-center gap-2">
                  <LogoTile
                    name={item.post.company?.name ?? "?"}
                    path={item.post.company?.logo_path}
                    size={20}
                  />
                  <Link
                    href={`/c/${item.post.company?.slug}`}
                    className="text-[13px] font-medium text-[var(--cloud-white)]"
                  >
                    {item.post.company?.name}
                  </Link>
                  <span className="text-[11px] text-[var(--color-text-dim)]">
                    {relative(item.at)}
                  </span>
                </div>
                <h2 className="text-[17px] leading-tight text-[var(--cloud-white)]">
                  {item.post.title}
                </h2>
                <div className="prose-sepi mt-1.5 text-[14px]">
                  <Markdown>{item.post.body}</Markdown>
                </div>
              </li>
            ) : (
              <li key={`i-${item.investment.id}`} className="py-3.5">
                <div className="flex items-start gap-2.5">
                  <Avatar
                    name={item.investment.investor?.full_name}
                    path={item.investment.investor?.avatar_path}
                    size={24}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-[1.45] text-[var(--color-text-muted)]">
                      <Link
                        href={`/p/${item.investment.investor?.slug}`}
                        className="font-medium text-[var(--cloud-white)]"
                      >
                        {item.investment.investor?.full_name}
                      </Link>{" "}
                      backed{" "}
                      <Link
                        href={`/c/${item.investment.company?.slug}`}
                        className="font-medium text-[var(--cloud-white)]"
                      >
                        {item.investment.company?.name}
                      </Link>{" "}
                      for{" "}
                      <span className="font-medium tabular-nums text-[var(--cloud-white)]">
                        {money(item.investment.amount)}
                      </span>
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.45] text-[var(--color-text-dim)]">
                      “{item.investment.note}”
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--color-text-dim)]">
                    {relative(item.at)}
                  </span>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
