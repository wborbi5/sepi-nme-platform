import { AppShell } from "@/components/shell/app-shell";
import { requireProfile } from "@/lib/auth";
import { getTodos, getUnreadCount } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  const [unread, todos] = await Promise.all([
    getUnreadCount(profile.id),
    getTodos(profile.id),
  ]);

  const pressing = todos.filter((t) => t.urgency === "overdue" || t.urgency === "now").length;

  return (
    <AppShell profile={profile} unread={unread} todoCount={pressing}>
      {children}
    </AppShell>
  );
}
