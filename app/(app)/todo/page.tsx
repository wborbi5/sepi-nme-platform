import { TodoList } from "@/components/todo-list";
import { Empty } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getTodos } from "@/lib/data";
import type { Todo, TodoUrgency } from "@/lib/types";

export const metadata = { title: "To-do · SEPi NME" };

const GROUPS: { urgency: TodoUrgency; title: string; note: string }[] = [
  { urgency: "overdue", title: "Late", note: "These were due already." },
  { urgency: "now", title: "This week", note: "" },
  { urgency: "soon", title: "Coming up", note: "" },
  { urgency: "later", title: "Whenever", note: "" },
];

export default async function TodoPage() {
  const profile = await requireProfile();
  const todos = await getTodos(profile.id);

  const byUrgency = (u: TodoUrgency): Todo[] => todos.filter((t) => t.urgency === u);
  const pressing = todos.filter(
    (t) => t.urgency === "overdue" || t.urgency === "now",
  ).length;

  return (
    <div>
      <header className="mb-7 flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">To-do</h1>
          <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
            Everything owed, and exactly where it goes.
          </p>
        </div>
        <div className="text-right">
          <div className="figure text-[30px] text-[var(--cloud-white)]">{pressing}</div>
          <div className="eyebrow mt-1">Need you now</div>
        </div>
      </header>

      {todos.length === 0 ? (
        <Empty>Nothing owed. Go build something.</Empty>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const items = byUrgency(group.urgency);
            if (items.length === 0) return null;
            return (
              <section key={group.urgency}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
                    {group.title}
                  </h2>
                  <span className="text-[12px] tabular-nums text-[var(--color-text-dim)]">
                    {items.length}
                  </span>
                </div>
                <TodoList todos={items} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
