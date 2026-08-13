"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar } from "@/components/avatar";
import { Mark } from "@/components/mark";
import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/types";

type NavItem = { href: string; label: string; detail: string };

const NAV: NavItem[] = [
  { href: "/", label: "Home", detail: "What is happening and what is due" },
  { href: "/members", label: "Members", detail: "Who is here and what they know" },
  { href: "/ask", label: "Ask", detail: "Who should I talk to about…" },
  { href: "/directory", label: "Companies", detail: "Everything being built" },
  { href: "/sprint", label: "Money Sprint", detail: "The leaderboard" },
  { href: "/calendar", label: "Calendar", detail: "Where to be, when" },
];

const INVESTOR_NAV: NavItem = {
  href: "/portfolio",
  label: "Portfolio",
  detail: "Your balance and your bets",
};

export function AppShell({
  profile,
  unread,
  todoCount,
  children,
}: {
  profile: Profile;
  unread: number;
  todoCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Any navigation closes everything. Without this, tapping a drawer link on a
  // phone leaves the drawer sitting over the page it just opened.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, accountOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [accountOpen]);

  const nav = profile.role === "new_member" ? NAV : [...NAV, INVESTOR_NAV];

  return (
    <div className="min-h-dvh">
      {/* Top bar: three bars on the left, circle on the right. Nothing else. */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--ink)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[var(--shell-max)] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-[var(--radius)]"
          >
            <span className="flex w-[18px] flex-col gap-[4px]" aria-hidden>
              <span className="h-[1.5px] w-full bg-[var(--cloud-white)]" />
              <span className="h-[1.5px] w-full bg-[var(--cloud-white)]" />
              <span className="h-[1.5px] w-full bg-[var(--cloud-white)]" />
            </span>
          </button>

          <Link href="/" className="flex items-center gap-2" aria-label="SEPi NME home">
            <Mark size={22} className="text-[var(--cloud-white)]" />
            <span className="font-[family-name:var(--font-display)] text-[14px] font-semibold tracking-tight text-[var(--cloud-white)]">
              SEPi
            </span>
          </Link>

          <div className="relative -mr-1" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Your account"
              aria-expanded={accountOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span className="relative">
                <Avatar name={profile.full_name} path={profile.avatar_path} size={30} ring />
                {unread + todoCount > 0 ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--ink)] bg-[var(--cobalt-lift)]"
                    aria-label={`${unread + todoCount} things need you`}
                  />
                ) : null}
              </span>
            </button>

            {accountOpen ? (
              <div className="absolute right-0 top-[52px] w-[236px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--ink-raised)] shadow-2xl">
                <div className="border-b border-[var(--color-border)] px-4 py-3">
                  <div className="truncate text-[14px] font-medium text-[var(--cloud-white)]">
                    {profile.full_name ?? profile.email}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--color-text-dim)]">
                    {profile.role === "admin"
                      ? "Admin"
                      : profile.role === "current_member"
                        ? "Current member"
                        : "New member"}
                  </div>
                </div>

                <AccountLink href={`/p/${profile.slug}`}>Your profile</AccountLink>
                <AccountLink href="/todo" badge={todoCount || undefined}>
                  To-do
                </AccountLink>
                <AccountLink href="/notifications" badge={unread || undefined}>
                  Notifications
                </AccountLink>
                <AccountLink href="/settings/notifications">Email settings</AccountLink>
                {profile.role === "admin" ? (
                  <AccountLink href="/admin">Admin console</AccountLink>
                ) : null}

                <form action="/auth/signout" method="post" className="border-t border-[var(--color-border)]">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 text-left text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Slide-over. Left side, because that is where the button is. */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 h-full w-full bg-black/70"
        />
        <nav
          aria-label="Main"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-[var(--color-border)] bg-[var(--ink)] transition-transform duration-200 ease-out",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
            <div className="flex items-center gap-2">
              <Mark size={22} className="text-[var(--cloud-white)]" />
              <span className="font-[family-name:var(--font-display)] text-[14px] font-semibold text-[var(--cloud-white)]">
                Sigma Eta Pi
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="-mr-2 flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)]"
            >
              <span aria-hidden className="text-[20px] leading-none">
                ×
              </span>
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto py-2">
            {nav.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block border-l-2 py-3 pl-4 pr-4",
                      active
                        ? "border-[var(--cloud-white)] bg-[var(--ink-raised)]"
                        : "border-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[15px] font-medium",
                        active ? "text-[var(--cloud-white)]" : "text-[var(--color-text-muted)]",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.4] text-[var(--color-text-dim)]">
                      {item.detail}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--color-border)] p-4">
            <Link href="/todo" className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-text-muted)]">Your to-do list</span>
              <span className="figure text-[18px] text-[var(--cloud-white)]">{todoCount}</span>
            </Link>
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-[var(--shell-max)] px-4 pb-20 pt-6">{children}</main>
    </div>
  );
}

function AccountLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 text-[13px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--cloud-white)]"
    >
      {children}
      {badge ? (
        <span className="rounded-full bg-[var(--cobalt-lift)] px-1.5 py-0.5 text-[11px] font-medium text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
