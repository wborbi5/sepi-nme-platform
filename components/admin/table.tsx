import type { ReactNode } from "react";

/** Dense tables, no brand treatment. Shared chrome for the admin console. */

export function AdminHead({ title, note }: { title: string; note?: string }) {
  return (
    <header className="mb-4">
      <h1 className="font-[family-name:var(--font-body)] text-[19px] font-bold text-[var(--cloud-white)]">
        {title}
      </h1>
      {note ? (
        <p className="mt-1 text-[13px] text-[var(--color-text-dim)]">{note}</p>
      ) : null}
    </header>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--color-border)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[var(--ink-sunken)] text-left">
            {head.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 font-medium text-[var(--color-text-dim)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-[var(--color-border)] last:border-0">{children}</tr>;
}

export function Cell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

export function AdminPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 border border-[var(--color-border)] p-4">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
