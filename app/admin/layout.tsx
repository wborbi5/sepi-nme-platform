import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

import "../globals.css";

/**
 * The admin console is deliberately unstyled. Left sidebar, dense tables, no
 * brand treatment, no polish. It is a control panel, and it should not be
 * mistaken for the member-facing app.
 */
const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Feed posts" },
  { href: "/admin/members", label: "Members & access" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/sprint", label: "Sprint review" },
  { href: "/admin/investments", label: "Investments" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <nav className="shrink-0 border-b border-[var(--color-border)] bg-[var(--ink-sunken)] md:w-[196px] md:border-b-0 md:border-r">
        <div className="px-4 py-3">
          <div className="text-[12px] uppercase tracking-wider text-[var(--color-text-dim)]">
            Admin
          </div>
          <div className="mt-0.5 truncate text-[13px] text-[var(--color-text-muted)]">
            {admin.email}
          </div>
        </div>

        <ul className="flex overflow-x-auto border-t border-[var(--color-border)] md:block md:overflow-visible">
          {NAV.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className="block whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--ink-raised)] hover:text-[var(--cloud-white)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="shrink-0 border-t border-[var(--color-border)] md:mt-2">
            <Link
              href="/"
              className="block whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--color-text-dim)]"
            >
              ← Back to app
            </Link>
          </li>
        </ul>
      </nav>

      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
