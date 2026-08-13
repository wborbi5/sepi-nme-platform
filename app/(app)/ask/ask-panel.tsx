"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import Markdown from "react-markdown";

import { Button, Input } from "@/components/ui";
import { askQuestion } from "@/app/actions/ask";

type Turn = {
  id: string;
  role: "user" | "assistant";
  body: string;
  refs: { slug: string; name: string }[];
};

const STARTERS = [
  "Who can help me get my first customer?",
  "Who knows anything about hardware?",
  "Who is furthest along on a real product?",
  "Who should I talk to about pitching?",
];

export function AskPanel({ initial }: { initial: Turn[] }) {
  const [turns, setTurns] = useState<Turn[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;

    setError(null);
    setDraft("");
    const optimistic: Turn = {
      id: `local-${Date.now()}`,
      role: "user",
      body: question,
      refs: [],
    };
    setTurns((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));

    startTransition(async () => {
      const result = await askQuestion(question);

      if (!result.ok) {
        setError(result.error);
        setTurns((prev) => prev.filter((t) => t.id !== optimistic.id));
        setDraft(question);
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-a`,
          role: "assistant",
          body: result.answer,
          refs: result.refs,
        },
      ]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    });
  };

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="flex-1 space-y-5">
        {turns.length === 0 ? (
          <div>
            <p className="text-[15px] leading-[1.5] text-[var(--color-text-muted)]">
              It only knows what people wrote on their own profiles. Ask it who to go talk to.
            </p>
            <ul className="mt-4 space-y-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-3 text-left text-[14px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--cloud-white)]"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {turns.map((turn) =>
          turn.role === "user" ? (
            <div key={turn.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-[var(--radius-lg)] bg-[var(--ink-raised)] px-4 py-2.5 text-[15px] leading-[1.5] text-[var(--cloud-white)]">
                {turn.body}
              </p>
            </div>
          ) : (
            <div key={turn.id}>
              <div className="prose-sepi max-w-[92%] text-[15px] leading-[1.55]">
                <Markdown>{turn.body}</Markdown>
              </div>
              {turn.refs.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {turn.refs.map((ref) => (
                    <li key={ref.slug}>
                      <Link
                        href={`/p/${ref.slug}`}
                        className="inline-flex min-h-0 items-center rounded-full border border-[var(--cobalt-lift)] px-3 py-1.5 text-[12px] text-[#a3b0ff]"
                      >
                        {ref.name} →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ),
        )}

        {pending ? (
          <p className="text-[14px] text-[var(--color-text-dim)]">Reading profiles…</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-0 -mx-4 mt-6 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Who should I ask about…"
          aria-label="Your question"
          maxLength={400}
        />
        <Button type="submit" disabled={pending || draft.trim().length < 3}>
          Ask
        </Button>
      </form>
    </div>
  );
}
