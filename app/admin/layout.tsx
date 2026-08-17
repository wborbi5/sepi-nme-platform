import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/*
 * Admin console shell. Deliberately unstyled: left sidebar, dense
 * content, no brand treatment. This is a control panel, not a page.
 *
 * Layers of protection here: middleware already walls /admin/*; this
 * layout re-verifies role = 'admin' against the database; and every
 * server action calls requireAdmin() again on top of that.
 */

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/investments", label: "Investments" },
  { href: "/admin/sprint", label: "Sprint" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/email", label: "Email" },
  { href: "/admin/settings", label: "Settings" },
];

export const metadata = { title: "Admin — SEPi Portal" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let connected = false;

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/admin");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      redirect("/");
    }
    connected = true;
  }

  return (
    <div className="flex min-h-screen bg-white text-[#111] [font-family:system-ui,sans-serif]">
      <aside className="w-52 shrink-0 border-r border-[#ddd] bg-[#f5f5f5]">
        <div className="border-b border-[#ddd] px-4 py-3">
          <Link href="/" className="text-sm font-bold">
            SEPi Admin
          </Link>
        </div>
        <nav className="py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block px-4 py-1.5 text-[13px] hover:bg-[#e8e8e8]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#ddd] px-4 py-2">
          <Link href="/" className="text-[12px] text-[#666] hover:underline">
            ← Back to portal
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        {!connected && (
          <div className="mb-4 border border-[#e0c000] bg-[#fff8dc] px-3 py-2 text-[13px]">
            <b>Supabase not connected.</b> Copy <code>.env.example</code> to{" "}
            <code>.env.local</code>, fill in the keys, and run migrations
            0001–0006. Until then this console renders with empty data and
            actions are disabled.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
