import Link from "next/link";

import { AdminHead, Cell, Row, Table } from "@/components/admin/table";
import { requireAdmin } from "@/lib/auth";
import { dayMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCE_LABEL, POST_KIND_LABEL, type Post } from "@/lib/types";

export const metadata = { title: "Feed posts · Admin" };

export default async function AdminPostsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*")
    .is("company_id", null)
    .order("published_at", { ascending: false });

  const posts = (data as Post[] | null) ?? [];

  return (
    <div>
      <AdminHead
        title="Feed posts"
        note="Chapter-wide posts. Only admins can write these; company updates are separate and live on company pages."
      />

      <Link
        href="/admin/posts/new"
        className="mb-4 inline-block border border-[var(--color-border-strong)] px-3 py-1.5 text-[13px] text-[var(--cloud-white)]"
      >
        + New post
      </Link>

      <Table head={["Date", "Kind", "Title", "Audience", "Pinned", ""]}>
        {posts.map((post) => (
          <Row key={post.id}>
            <Cell className="whitespace-nowrap text-[var(--color-text-dim)]">
              {dayMonth(post.published_at)}
            </Cell>
            <Cell className="text-[var(--color-text-muted)]">{POST_KIND_LABEL[post.kind]}</Cell>
            <Cell className="text-[var(--cloud-white)]">{post.title}</Cell>
            <Cell className="text-[var(--color-text-dim)]">{AUDIENCE_LABEL[post.audience]}</Cell>
            <Cell className="text-[var(--color-text-dim)]">{post.pinned ? "yes" : ""}</Cell>
            <Cell>
              <Link
                href={`/admin/posts/${post.id}`}
                className="text-[var(--cobalt-lift)]"
              >
                edit
              </Link>
            </Cell>
          </Row>
        ))}
        {posts.length === 0 ? (
          <Row>
            <Cell className="text-[var(--color-text-dim)]">No posts yet.</Cell>
          </Row>
        ) : null}
      </Table>
    </div>
  );
}
