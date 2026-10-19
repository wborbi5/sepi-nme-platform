import { redirect } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import ProfileEditForm from "@/components/ProfileEditForm";
import Seal from "@/components/Seal";
import { getNavSession, getProfiles } from "@/lib/data";
import { profileNeedsOnboarding } from "@/lib/profile-form";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Welcome — SEPi Portal" };
export const maxDuration = 60;

/*
 * First-run onboarding. Role is already set at invite time — this step
 * collects the profile fields the directory and NME tracker need.
 */

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

  // Name is the only required profile field. Major, year, and the rest
  // can be filled in later from Settings.
  if (!profileNeedsOnboarding(profile)) redirect("/companies");

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
            Add your name so brothers can find you. Everything else is optional.
          </p>
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
