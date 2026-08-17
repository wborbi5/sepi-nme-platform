import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import ProfileEditForm from "@/components/ProfileEditForm";
import { getNavSession, getProfiles } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Edit profile — SEPi Portal" };

// Resume parsing (parseMyResume) waits on LlamaExtract; give the
// serverless function room beyond the 10s default.
export const maxDuration = 60;

export default async function EditProfilePage() {
  if (!supabaseConfigured()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings/profile");

  const [profiles, nav] = await Promise.all([getProfiles(), getNavSession()]);
  const profile = profiles.find((p) => p.id === user.id);
  if (!profile) redirect("/");

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-5xl">
          Edit profile
        </h1>
        <ProfileEditForm profile={profile} />
      </div>
    </div>
  );
}
