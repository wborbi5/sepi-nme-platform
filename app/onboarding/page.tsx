import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import ProfileEditForm from "@/components/ProfileEditForm";
import Seal from "@/components/Seal";
import { getNavSession, getProfiles } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Welcome — SEPi Portal" };
export const maxDuration = 60;

/*
 * First-run onboarding. Role is already set at invite time — this step
 * collects the profile fields the directory and NME tracker need.
 */

function progress(done: number, total: number) {
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <div className="mb-2 flex justify-between text-xs font-semibold text-slate-blue">
        <span>Profile setup</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone">
        <div
          className="h-full rounded-full bg-navy transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function OnboardingPage() {
  if (!supabaseConfigured()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const [profiles, nav] = await Promise.all([getProfiles(), getNavSession()]);
  const profile = profiles.find((p) => p.id === user.id);
  if (!profile) redirect("/");

  const checks = [
    Boolean(profile.full_name?.trim()),
    Boolean(profile.major?.trim()),
    Boolean(profile.grad_year),
    Boolean(profile.slug),
  ];
  const done = checks.filter(Boolean).length;
  const complete = done === checks.length;

  if (complete) redirect("/companies");

  const roleLabel =
    profile.role === "new_member"
      ? "New Member"
      : profile.role === "admin"
        ? "Admin"
        : "Current Member";

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <div className="flex flex-col items-center pt-10">
          <Seal size={48} />
          <h1 className="display-serif mt-6 text-center text-5xl">Welcome</h1>
          <p className="mt-3 max-w-md text-center text-slate-blue">
            You’re in as <span className="font-semibold text-midnight">{roleLabel}</span>.
            Finish your profile so brothers can find you.
          </p>
          {progress(done, checks.length)}
        </div>

        <div className="mt-10">
          <ProfileEditForm profile={profile} />
        </div>

        <p className="mt-8 text-center text-sm text-slate-blue">
          You can edit this anytime in{" "}
          <Link href="/settings/profile" className="font-semibold text-oxford hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
