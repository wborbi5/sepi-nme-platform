import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { updateEmailPrefs } from "./actions";

export const metadata = { title: "Email preferences — SEPi Portal" };

const TYPES: { key: string; label: string; detail: string }[] = [
  {
    key: "investment_received",
    label: "Investment received",
    detail: "Someone backed your company — includes the 72-hour deadline.",
  },
  {
    key: "response_reminder",
    label: "Response reminder",
    detail: "24 hours left to respond to a pending investment.",
  },
  {
    key: "investment_declined",
    label: "Investment declined",
    detail: "Your investment was declined and funds returned.",
  },
  {
    key: "sprint_rejected",
    label: "Sprint entry rejected",
    detail: "Your Money Sprint entry was rejected, with the reason.",
  },
  {
    key: "weekly_digest",
    label: "Weekly digest",
    detail: "Mondays 7am: sessions this week and anything pending your action.",
  },
];

export default async function NotificationSettingsPage() {
  if (!supabaseConfigured()) redirect("/");
  const nav = await getNavSession();
  if (!nav.userId) redirect("/login?next=/settings/notifications");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_prefs")
    .eq("id", nav.userId)
    .single();
  const prefs = (profile?.email_prefs ?? {}) as Record<string, boolean>;

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-5xl">
          Email preferences
        </h1>
        <p className="mb-8 text-center text-slate-blue">
          In-app notifications always arrive. Email is only for things that
          need a response — opt out of any of them here.
        </p>

        <form action={updateEmailPrefs} className="flex flex-col gap-1">
          {TYPES.map((t) => (
            <label
              key={t.key}
              className="flex min-h-11 cursor-pointer items-start gap-4 rounded-lg border border-stone bg-paper px-4 py-3"
            >
              <input
                type="checkbox"
                name={t.key}
                defaultChecked={prefs[t.key] !== false}
                className="mt-1 h-5 w-5"
              />
              <span>
                <b className="text-midnight">{t.label}</b>
                <span className="block text-sm leading-6 text-steel">{t.detail}</span>
              </span>
            </label>
          ))}
          <div className="mt-5">
            <button
              type="submit"
              className="btn rounded-full border-0 bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford"
            >
              Save preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
