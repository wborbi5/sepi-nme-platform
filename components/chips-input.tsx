"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { INPUT_CLASS } from "@/components/ui";

/**
 * Free-text chips with suggestions. Tap to add, tap the × to remove — no
 * hover-dependent affordance and every target clears 44px.
 */
export function ChipsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Type and press enter",
  max = 12,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const item = raw.trim().toLowerCase().slice(0, 40);
    if (!item) return;
    if (value.some((v) => v.toLowerCase() === item)) return;
    if (value.length >= max) return;
    onChange([...value, item]);
    setDraft("");
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  const unused = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label={`Remove ${item}`}
                className="inline-flex min-h-0 items-center gap-1.5 rounded-full border border-[var(--mist-blue)] px-3 py-1.5 text-[12px] text-[var(--cloud-white)]"
              >
                {item}
                <span aria-hidden className="text-[var(--color-text-dim)]">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
          if (e.key === "Backspace" && !draft && value.length) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length >= max ? "That is plenty" : placeholder}
        disabled={value.length >= max}
        className={cn(INPUT_CLASS, "text-[14px]")}
      />

      {unused.length > 0 && value.length < max ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {unused.slice(0, 8).map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => add(s)}
                className="inline-flex min-h-0 items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--cloud-white)]"
              >
                + {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
