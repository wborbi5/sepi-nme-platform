import Link from "next/link";
import Markdown from "react-markdown";

import { Chip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dayMonth, whenLabel } from "@/lib/format";
import { AUDIENCE_LABEL, POST_KIND_LABEL, type Post, type PostKind } from "@/lib/types";

/** Kind drives one accent line and nothing else. No icons, no illustrations. */
const KIND_RULE: Record<PostKind, string> = {
  alert: "border-l-[var(--color-danger)]",
  assignment: "border-l-[var(--color-warning)]",
  form: "border-l-[var(--cobalt-lift)]",
  sprint: "border-l-[var(--color-success)]",
  session: "border-l-[var(--mist-blue)]",
  announcement: "border-l-[var(--color-border-strong)]",
  update: "border-l-[var(--color-border-strong)]",
};

export function PostCard({ post, admin }: { post: Post; admin?: boolean }) {
  const kind = post.kind;

  return (
    <article
      className={cn(
        "rounded-r-[var(--radius-lg)] border border-l-2 border-[var(--color-border)] bg-[var(--ink-raised)] px-4 py-4",
        KIND_RULE[kind],
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="eyebrow text-[var(--color-text-muted)]">{POST_KIND_LABEL[kind]}</span>
        <span className="text-[11px] text-[var(--color-text-dim)]">
          {dayMonth(post.published_at)}
        </span>
        {post.pinned ? <Chip tone="bright">Pinned</Chip> : null}
        {post.audience !== "all" ? (
          <Chip tone="neutral">{AUDIENCE_LABEL[post.audience]}</Chip>
        ) : null}
      </div>

      <h3 className="text-[19px] leading-[1.2] text-[var(--cloud-white)]">{post.title}</h3>

      {/* Concrete detail sits above the prose, because it is what people came for. */}
      {post.event_at || post.location ? (
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 border-y border-[var(--color-border)] py-2.5">
          {post.event_at ? (
            <div>
              <div className="eyebrow">When</div>
              <div className="text-[14px] font-medium text-[var(--cloud-white)]">
                {whenLabel(post.event_at)}
              </div>
            </div>
          ) : null}
          {post.location ? (
            <div>
              <div className="eyebrow">Where</div>
              <div className="text-[14px] font-medium text-[var(--cloud-white)]">
                {post.location}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {post.body ? (
        <div className="prose-sepi mt-2.5 text-[14px]">
          <Markdown>{post.body}</Markdown>
        </div>
      ) : null}

      {post.cta_href && post.cta_label ? (
        <Link
          href={post.cta_href}
          className="mt-3.5 inline-flex min-h-[var(--tap-min)] items-center rounded-[var(--radius)] bg-[var(--cloud-white)] px-4 text-[14px] font-medium text-[var(--midnight)]"
        >
          {post.cta_label}
        </Link>
      ) : null}

      {admin ? (
        <div className="mt-3 border-t border-[var(--color-border)] pt-2.5">
          <Link href={`/admin/posts/${post.id}`} className="text-[12px] text-[var(--cobalt-lift)]">
            Edit post
          </Link>
        </div>
      ) : null}
    </article>
  );
}
