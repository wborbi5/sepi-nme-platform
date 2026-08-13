import Link from "next/link";
import { revalidatePath } from "next/cache";

import { Button, Empty } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getNotifications } from "@/lib/data";
import { relative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications · SEPi NME" };

async function markAllRead() {
  "use server";
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const notifications = await getNotifications(profile.id);
  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div>
          <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Notifications</h1>
          {unread > 0 ? (
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">{unread} unread</p>
          ) : null}
        </div>
        {unread > 0 ? (
          <form action={markAllRead}>
            <Button variant="outline" type="submit" className="h-9 min-h-0 px-3 text-[12px]">
              Mark all read
            </Button>
          </form>
        ) : null}
      </header>

      {notifications.length === 0 ? (
        <Empty>Nothing yet.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {notifications.map((n) => {
            const body = (
              <div className="flex items-start gap-3 py-3.5">
                <span
                  className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.read_at ? "bg-transparent" : "bg-[var(--cobalt-lift)]"
                  }`}
                  aria-hidden
                />
                <p
                  className={`min-w-0 flex-1 text-[14px] leading-[1.45] ${
                    n.read_at ? "text-[var(--color-text-dim)]" : "text-[var(--cloud-white)]"
                  }`}
                >
                  {n.body}
                </p>
                <span className="shrink-0 text-[11px] text-[var(--color-text-dim)]">
                  {relative(n.created_at)}
                </span>
              </div>
            );

            return (
              <li key={n.id}>
                {n.link ? <Link href={n.link}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
