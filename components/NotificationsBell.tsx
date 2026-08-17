"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { NotificationRow } from "@/lib/data";
import { markAllNotificationsRead } from "@/app/notifications/actions";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationsBell({
  items,
  unreadCount,
}: {
  items: NotificationRow[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // optimistic: clear the badge the moment mark-read is clicked
  const [cleared, setCleared] = useState(false);
  const count = cleared ? 0 : unreadCount;

  return (
    <div className="relative">
      <button
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-midnight hover:text-oxford"
      >
        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden>
          <path
            d="M10 21a2 2 0 002-2H8a2 2 0 002 2zM18 15V9a8 8 0 10-16 0v6l-2 2v1h20v-1l-2-2z"
            fill="currentColor"
          />
        </svg>
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b91c1c] px-1 text-[11px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 w-80 border border-stone bg-paper shadow-lg">
          <div className="flex items-center justify-between border-b border-stone px-4 py-2">
            <b className="text-sm text-midnight">Notifications</b>
            {count > 0 && (
              <button
                disabled={pending}
                onClick={() => {
                  setCleared(true);
                  startTransition(() => markAllNotificationsRead());
                }}
                className="cursor-pointer border-0 bg-transparent text-xs font-semibold text-oxford hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-steel">
                Nothing yet.
              </p>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => setOpen(false)}
                className={`block border-b border-stone px-4 py-3 text-[14px] leading-5 hover:bg-cream ${
                  n.read_at || cleared ? "text-steel" : "font-semibold text-midnight"
                }`}
              >
                {n.body}
                <span className="ml-2 text-xs font-normal text-mist">
                  {timeAgo(n.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
