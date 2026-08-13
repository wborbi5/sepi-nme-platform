import Link from "next/link";

import { Chip, Empty } from "@/components/ui";
import { cn } from "@/lib/cn";
import { relative, whenLabel } from "@/lib/format";
import type { Todo, TodoUrgency } from "@/lib/types";

const URGENCY_TONE: Record<TodoUrgency, "danger" | "warning" | "bright" | "neutral"> = {
  overdue: "danger",
  now: "warning",
  soon: "bright",
  later: "neutral",
};

const URGENCY_RULE: Record<TodoUrgency, string> = {
  overdue: "border-l-[var(--color-danger)]",
  now: "border-l-[var(--color-warning)]",
  soon: "border-l-[var(--mist-blue)]",
  later: "border-l-[var(--color-border-strong)]",
};

const URGENCY_WORD: Record<TodoUrgency, string> = {
  overdue: "Overdue",
  now: "Due now",
  soon: "This week",
  later: "Whenever",
};

/**
 * A to-do is a sentence and a destination. The row is the link — there is no
 * separate button, because there is nothing else you could want to do with it.
 */
export function TodoList({ todos, limit }: { todos: Todo[]; limit?: number }) {
  const shown = limit ? todos.slice(0, limit) : todos;

  if (shown.length === 0) {
    return <Empty>Nothing owed. Go build something.</Empty>;
  }

  return (
    <ul className="space-y-2">
      {shown.map((todo) => (
        <li key={todo.key}>
          <Link
            href={todo.href}
            className={cn(
              "block rounded-r-[var(--radius-lg)] border border-l-2 border-[var(--color-border)] bg-[var(--ink-raised)] px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]",
              URGENCY_RULE[todo.urgency],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-medium leading-[1.35] text-[var(--cloud-white)]">
                  {todo.title}
                </div>
                {todo.detail ? (
                  <div className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[var(--color-text-muted)]">
                    {todo.detail}
                  </div>
                ) : null}
              </div>
              <Chip tone={URGENCY_TONE[todo.urgency]}>
                {todo.due_at ? relative(todo.due_at) : URGENCY_WORD[todo.urgency]}
              </Chip>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
              <span className="text-[var(--cobalt-lift)]">{todo.cta} →</span>
              {todo.due_at ? <span>· {whenLabel(todo.due_at)}</span> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
