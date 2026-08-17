"use client";

import Link from "next/link";
import { useState } from "react";
import Seal from "./Seal";
import NotificationsBell from "./NotificationsBell";
import type { NavSession } from "@/lib/data";

/*
 * The YC-style option bar. Seal sits center, links flank it, and the
 * Apply button is replaced by Sign up. Every destination except the
 * homepage is auth-walled by middleware.
 *
 * During the investment window the header goes sticky and pins the
 * viewer's remaining balance (Investopedia-simulator style).
 */

const LEFT_LINKS = [
  { href: "/about", label: "About" },
  { href: "/companies", label: "Companies" },
  { href: "/people", label: "People" },
];

const RIGHT_LINKS = [{ href: "/updates", label: "Updates" }];

const MEMBER_LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/portfolio", label: "Portfolio" },
];

const RESOURCE_LINKS = [
  { href: "/resources/internships", label: "Internship Opportunities" },
  { href: "/resources/requests-for-startups", label: "Requests for Startups" },
  { href: "/resources/events", label: "Events" },
];

const EMPTY_SESSION: NavSession = {
  initial: null,
  isAdmin: false,
  userId: null,
  balance: null,
  notifications: [],
  unreadCount: 0,
};

export default function SiteNav({
  session = EMPTY_SESSION,
}: {
  session?: NavSession;
}) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const authed = Boolean(session.initial);
  const rightLinks = authed ? [...RIGHT_LINKS, ...MEMBER_LINKS] : RIGHT_LINKS;

  const navLink =
    "px-4 py-2 text-[15px] font-semibold text-midnight hover:text-oxford inline-flex items-center min-h-[44px]";

  const balanceChip =
    session.balance != null ? (
      <Link
        href="/portfolio"
        className="btn inline-flex items-center rounded-full border border-navy bg-powder px-4 py-2 text-sm font-bold text-navy"
        title="Your remaining investment balance"
      >
        ${session.balance.toLocaleString()} left
      </Link>
    ) : null;

  return (
    <header
      className={`bg-cream relative z-40 ${session.balance != null ? "sticky top-0 border-b border-stone" : ""}`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* mobile: seal left, burger right */}
        <div className="flex items-center lg:hidden">
          <Link href="/" aria-label="SEPi Portal home">
            <Seal size={40} />
          </Link>
        </div>

        {/* desktop: links | seal | links */}
        <div className="hidden flex-1 items-center justify-end lg:flex">
          {LEFT_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={navLink}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden px-6 lg:block">
          <Link href="/" aria-label="SEPi Portal home">
            <Seal size={48} />
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-between lg:flex">
          <div className="flex items-center">
            {rightLinks.map((l) => (
              <Link key={l.href} href={l.href} className={navLink}>
                {l.label}
              </Link>
            ))}
            <div
              className="relative"
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <button
                className={`${navLink} gap-1 bg-transparent border-0 cursor-pointer`}
                onClick={() => setResourcesOpen((v) => !v)}
                aria-expanded={resourcesOpen}
              >
                Resources
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              {resourcesOpen && (
                <div className="absolute left-0 top-full w-64 bg-paper shadow-lg border border-stone py-2">
                  {RESOURCE_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="block px-5 py-2.5 text-[15px] font-semibold text-midnight hover:bg-cream"
                      onClick={() => setResourcesOpen(false)}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {balanceChip}
            {session.isAdmin && (
              <Link
                href="/admin"
                className="px-2 py-2 text-[15px] font-semibold text-oxford hover:text-cobalt"
              >
                Admin
              </Link>
            )}
            {authed && (
              <NotificationsBell
                items={session.notifications}
                unreadCount={session.unreadCount}
              />
            )}
            {authed ? (
              <Link
                href="/p/me"
                aria-label="Your profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coolgray bg-paper text-sm font-bold text-midnight"
              >
                {session.initial!.toUpperCase()}
              </Link>
            ) : (
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full border border-coolgray bg-paper text-sm font-bold text-steel"
              >
                Σ
              </span>
            )}
            {!authed && (
              <Link
                href="/login"
                className="btn inline-flex items-center rounded-full bg-navy px-6 py-2.5 text-[15px] font-bold text-white hover:bg-oxford"
              >
                Sign up
              </Link>
            )}
          </div>
        </div>

        {/* mobile right side */}
        <div className="flex items-center gap-1 lg:hidden">
          {balanceChip}
          {authed && (
            <NotificationsBell
              items={session.notifications}
              unreadCount={session.unreadCount}
            />
          )}
          {!authed && (
            <Link
              href="/login"
              className="btn inline-flex items-center rounded-full bg-navy px-5 py-2 text-sm font-bold text-white"
            >
              Sign up
            </Link>
          )}
          <button
            aria-label="Menu"
            className="flex h-11 w-11 items-center justify-center bg-transparent border-0"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden>
              <path d="M0 1h22M0 8h22M0 15h22" stroke="#101828" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-stone bg-paper lg:hidden">
          {[
            ...LEFT_LINKS,
            ...rightLinks,
            ...RESOURCE_LINKS,
            ...(authed ? [{ href: "/p/me", label: "My profile" }] : []),
            ...(session.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-6 py-3 text-base font-semibold text-midnight"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
