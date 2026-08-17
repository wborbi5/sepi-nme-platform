"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompanyRow } from "@/lib/data";

/*
 * YC Startup Directory treatment: filter rail on the left, big search
 * bar, one card row per company with logo, name, one-liner and tags.
 * Filterable by founding year, industry, and founder pledge class.
 */

type Props = { companies: CompanyRow[]; logoBase: string | null };

function uniqSorted(values: (string | number | null)[]) {
  return [...new Set(values.filter((v): v is string | number => v != null && v !== ""))].sort(
    (a, b) => String(b).localeCompare(String(a))
  );
}

export default function CompanyDirectory({ companies, logoBase }: Props) {
  const [q, setQ] = useState("");
  const [industries, setIndustries] = useState<Set<string>>(new Set());
  const [years, setYears] = useState<Set<number>>(new Set());
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"default" | "name" | "newest">("default");

  const allIndustries = useMemo(
    () => uniqSorted(companies.map((c) => c.industry)) as string[],
    [companies]
  );
  const allYears = useMemo(
    () => uniqSorted(companies.map((c) => c.founded_year)) as number[],
    [companies]
  );
  const allClasses = useMemo(
    () =>
      uniqSorted(
        companies.flatMap((c) => c.founders.map((f) => f.pledge_class))
      ) as string[],
    [companies]
  );

  const filtered = useMemo(() => {
    let rows = companies;
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.one_liner.toLowerCase().includes(needle) ||
          c.founders.some((f) => f.full_name?.toLowerCase().includes(needle))
      );
    }
    if (industries.size)
      rows = rows.filter((c) => c.industry && industries.has(c.industry));
    if (years.size)
      rows = rows.filter((c) => c.founded_year != null && years.has(c.founded_year));
    if (classes.size)
      rows = rows.filter((c) =>
        c.founders.some((f) => f.pledge_class && classes.has(f.pledge_class))
      );
    if (sort === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "newest")
      rows = [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return rows;
  }, [companies, q, industries, years, classes, sort]);

  function toggle<T>(set: Set<T>, value: T, update: (s: Set<T>) => void) {
    const nextSet = new Set(set);
    if (nextSet.has(value)) nextSet.delete(value);
    else nextSet.add(value);
    update(nextSet);
  }

  const checkboxRow =
    "flex cursor-pointer items-center gap-2 py-1 text-[15px] text-midnight";

  function FilterGroup<T extends string | number>({
    title,
    values,
    selected,
    onToggle,
    count,
  }: {
    title: string;
    values: T[];
    selected: Set<T>;
    onToggle: (v: T) => void;
    count: (v: T) => number;
  }) {
    if (!values.length) return null;
    return (
      <div className="border-t border-stone pt-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">
          {title}
        </h3>
        {values.map((v) => (
          <label key={String(v)} className={checkboxRow}>
            <input
              type="checkbox"
              checked={selected.has(v)}
              onChange={() => onToggle(v)}
              className="h-4 w-4 accent-[#1f3a5f]"
              style={{ minHeight: 16 }}
            />
            <span>{v}</span>
            <span className="rounded bg-stone px-1.5 text-xs text-steel">
              {count(v)}
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-24 lg:grid-cols-[260px_1fr]">
      {/* --------------------------------------------------- filter rail */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-stone bg-paper p-5">
          <label className={checkboxRow}>
            <input
              type="checkbox"
              checked={!industries.size && !years.size && !classes.size}
              onChange={() => {
                setIndustries(new Set());
                setYears(new Set());
                setClasses(new Set());
              }}
              className="h-4 w-4 accent-[#1f3a5f]"
              style={{ minHeight: 16 }}
            />
            <span className="font-semibold">All companies</span>
            <span className="rounded bg-stone px-1.5 text-xs text-steel">
              {companies.length}
            </span>
          </label>

          <div className="mt-4 flex flex-col gap-4">
            <FilterGroup
              title="Pledge class"
              values={allClasses}
              selected={classes}
              onToggle={(v) => toggle(classes, v, setClasses)}
              count={(v) =>
                companies.filter((c) =>
                  c.founders.some((f) => f.pledge_class === v)
                ).length
              }
            />
            <FilterGroup
              title="Industry"
              values={allIndustries}
              selected={industries}
              onToggle={(v) => toggle(industries, v, setIndustries)}
              count={(v) => companies.filter((c) => c.industry === v).length}
            />
            <FilterGroup
              title="Year founded"
              values={allYears}
              selected={years}
              onToggle={(v) => toggle(years, v, setYears)}
              count={(v) => companies.filter((c) => c.founded_year === v).length}
            />
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------- results */}
      <div>
        <div className="mb-2 flex items-center justify-end gap-2 text-sm text-steel">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-md border border-coolgray bg-paper px-3 py-2 text-sm text-midnight"
          >
            <option value="default">Default</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div className="rounded-lg border border-stone bg-paper p-4">
          <input
            type="search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border-2 border-oxford bg-paper px-4 py-3 text-base outline-none"
          />
        </div>

        <p className="mt-4 mb-2 text-sm text-steel">
          Showing {filtered.length} of {companies.length}{" "}
          {companies.length === 1 ? "company" : "companies"}
        </p>

        <div className="overflow-hidden rounded-lg border border-stone bg-paper">
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-blue">
              {companies.length === 0
                ? "No companies yet — they appear here as members submit them."
                : "Nothing matches those filters."}
            </div>
          )}
          {filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/companies/${c.slug}`}
              className={`flex items-center gap-5 p-5 hover:bg-cream ${
                i > 0 ? "border-t border-stone" : ""
              }`}
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone bg-cream">
                {c.logo_path && logoBase ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${logoBase}/${c.logo_path}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-mist">
                    {c.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-lg font-bold text-midnight">
                    {c.name}
                  </span>
                  {c.founded_year && (
                    <span className="text-sm text-steel">
                      Founded {c.founded_year}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[15px] text-midnight">
                  {c.one_liner}
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  {c.founders
                    .filter((f) => f.pledge_class)
                    .slice(0, 1)
                    .map((f) => (
                      <span
                        key={f.slug ?? f.full_name}
                        className="inline-flex items-center gap-1 rounded bg-stone px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-midnight"
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center bg-navy text-[9px] font-bold text-white">
                          Σ
                        </span>
                        {f.pledge_class}
                      </span>
                    ))}
                  {c.industry && (
                    <span className="rounded bg-stone px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-midnight">
                      {c.industry}
                    </span>
                  )}
                  {!c.investable && (
                    <span className="rounded bg-powder px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-navy">
                      Founding class
                    </span>
                  )}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
