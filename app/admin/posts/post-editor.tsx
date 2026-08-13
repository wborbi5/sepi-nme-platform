"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { deletePost, upsertPost } from "@/app/actions/admin";
import { AUDIENCE_LABEL, POST_KIND_LABEL, type Post } from "@/lib/types";

/** Local datetime value for <input type="datetime-local">, or "". */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ post }: { post: Post | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: post?.title ?? "",
    body: post?.body ?? "",
    kind: post?.kind ?? "announcement",
    audience: post?.audience ?? "all",
    pinned: post?.pinned ?? false,
    ctaLabel: post?.cta_label ?? "",
    ctaHref: post?.cta_href ?? "",
    eventAt: toLocalInput(post?.event_at ?? null),
    location: post?.location ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await upsertPost({ ...form, id: post?.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    });
  };

  const remove = () => {
    if (!post) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    });
  };

  return (
    <div className="max-w-[620px] space-y-4">
      <Field label="Title">
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kind" hint="Drives the accent rule on the card.">
          <Select value={form.kind} onChange={(e) => set("kind", e.target.value as Post["kind"])}>
            {Object.entries(POST_KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Who sees it">
          <Select
            value={form.audience}
            onChange={(e) => set("audience", e.target.value as Post["audience"])}
          >
            {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Body" hint="Markdown. Keep it short — this is a feed, not a newsletter.">
        <Textarea
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          maxLength={8000}
          className="min-h-[180px]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="When" optional hint="Shows as a concrete date block.">
          <Input
            type="datetime-local"
            value={form.eventAt}
            onChange={(e) => set("eventAt", e.target.value)}
          />
        </Field>
        <Field label="Where" optional>
          <Input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Farmer 025"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button label" optional>
          <Input
            value={form.ctaLabel}
            onChange={(e) => set("ctaLabel", e.target.value)}
            placeholder="Fill out the form"
            maxLength={40}
          />
        </Field>
        <Field label="Button link" optional hint="An in-app path like /apply, or a full URL.">
          <Input
            value={form.ctaHref}
            onChange={(e) => set("ctaHref", e.target.value)}
            placeholder="/sprint"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.pinned}
          onChange={(e) => set("pinned", e.target.checked)}
          className="h-[18px] min-h-0 w-[18px] accent-[var(--cobalt-lift)]"
        />
        <span className="text-[14px] text-[var(--cloud-white)]">Pin to the top of the feed</span>
      </label>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button onClick={save} disabled={pending || !form.title.trim()}>
          {pending ? "Saving…" : post ? "Save changes" : "Publish"}
        </Button>
        {post ? (
          <Button variant="danger" onClick={remove} disabled={pending}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
