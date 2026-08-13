"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import { Empty, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { list } from "@/lib/format";
import { ENERGY_LABEL, type Energy, type Profile } from "@/lib/types";

export type MemberRow = Profile & {
  companies: { name: string; slug: string; logo_path: string | null }[];
  /** Precomputed server-side against the viewer, so this stays a pure filter. */
  connection: string | null;
};

type Filter = "all" | "new" | "current" | "can-help";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "can-help", label: "Can help you" },
  { id: "new", label: "New members" },
  { id: "current", label: "Current members" },
];

/**
 * People, not cards. Each row reads as a sentence about a person and links as
 * a whole — no per-row button row, nothing that looks like a control panel.
 */
export function MembersList({ members }: { members: MemberRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();

    return members.filter((m) => {
      if (filter === "new" && m.member_track !== "new" && m.role !== "new_member") return false;
      if (filter === "current" && m.member_track !== "current" && m.role !== "current_member")
        return false;
      if (filter === "can-help" && !m.connection) return false;

      if (!q) return true;

      const haystack = [
        m.full_name,
        m.headline,
        m.currently,
        m.superpower,
        m.major,
        m.hometown,
        ...(m.ask_me_about ?? []),
        ...(m.need_help_with ?? []),
        ...(m.skills ?? []),
        ...(m.interests ?? []),
        ...m.companies.map((c) => c.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [members, query, filter]);

  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a name, a skill, a company"
        aria-label="Search members"
        type="search"
      />

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "min-h-0 shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-colors",
              filter === f.id
                ? "border-[var(--cloud-white)] bg-[var(--cloud-white)] text-[var(--midnight)]"
                : "border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-2 text-[12px] text-[var(--color-text-dim)]">
        {shown.length} {shown.length === 1 ? "person" : "people"}
      </div>

      {shown.length === 0 ? (
        <div className="mt-4">
          <Empty>Nobody matches that.</Empty>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {shown.map((m) => (
            <li key={m.id}>
              <Link href={`/p/${m.slug}`} className="block py-4">
                <div className="flex items-start gap-3">
                  <Avatar name={m.full_name} path={m.avatar_path} size={42} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[16px] font-medium leading-tight text-[var(--cloud-white)]">
                        {m.full_name}
                      </span>
                      {m.energy ? (
                        <span className="text-[12px] text-[var(--color-text-dim)]">
                          {ENERGY_LABEL[m.energy as Energy]}
                        </span>
                      ) : null}
                    </div>

                    {m.headline ? (
                      <p className="mt-1 text-[14px] leading-[1.45] text-[var(--color-text-muted)]">
                        {m.headline}
                      </p>
                    ) : null}

                    {m.companies.length > 0 ? (
                      <p className="mt-1 text-[13px] text-[var(--mist-blue)]">
                        {list(m.companies.map((c) => c.name))}
                      </p>
                    ) : null}

                    {/* The one thing that makes this person worth your tap. */}
                    {m.connection ? (
                      <p className="mt-1.5 text-[13px] leading-[1.4] text-[#a3b0ff]">
                        {m.connection}
                      </p>
                    ) : (m.ask_me_about ?? []).length > 0 ? (
                      <p className="mt-1.5 text-[13px] text-[var(--color-text-dim)]">
                        Ask about {list(m.ask_me_about, 3)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
