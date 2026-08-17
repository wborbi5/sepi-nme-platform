import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import {
  getProfiles,
  getNavSession,
  publicStorageUrl,
} from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/*
 * Member profile in the Garry Tan page layout: breadcrumb, huge italic
 * serif name, portrait left with social icons under it, bio right —
 * then the member's details listed vertically underneath.
 */

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profiles, nav] = await Promise.all([
    getProfiles(),
    getNavSession(),
  ]);

  let profile = profiles.find((p) => p.slug === slug) ?? null;

  // /p/me → the signed-in member's own profile
  if (!profile && slug === "me" && nav.userId) {
    profile = profiles.find((p) => p.id === nav.userId) ?? null;
  }
  if (!profile) notFound();

  const isOwnProfile = nav.userId === profile.id;

  const big = profile.big_id
    ? profiles.find((p) => p.id === profile.big_id) ?? null
    : null;
  const littles = profiles.filter((p) => p.big_id === profile.id);

  // Companies they're part of
  let companies: { name: string; slug: string }[] = [];
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_members")
      .select("companies ( name, slug )")
      .eq("profile_id", profile.id);
    companies = (data ?? [])
      .map((r: any) => r.companies)
      .filter(Boolean);
  }

  const avatar = publicStorageUrl("avatars", profile.avatar_path);
  const roleLabel =
    profile.role === "admin"
      ? "Executive Board"
      : profile.role === "current_member"
        ? "Founding Class"
        : "New Member";

  const details: { label: string; value: React.ReactNode }[] = [];
  if (profile.pledge_class)
    details.push({ label: "Pledged SEPi", value: profile.pledge_class });
  details.push({ label: "Role", value: roleLabel });
  if (profile.position) details.push({ label: "Position", value: profile.position });
  if (profile.major) details.push({ label: "Major", value: profile.major });
  if (profile.grad_year)
    details.push({ label: "Graduation year", value: profile.grad_year });
  if (big)
    details.push({
      label: "Big",
      value: big.slug ? (
        <Link href={`/p/${big.slug}`} className="text-oxford hover:underline">
          {big.full_name}
        </Link>
      ) : (
        big.full_name
      ),
    });
  if (littles.length)
    details.push({
      label: littles.length === 1 ? "Little" : "Littles",
      value: (
        <span className="flex flex-wrap gap-x-3">
          {littles.map((l) =>
            l.slug ? (
              <Link key={l.id} href={`/p/${l.slug}`} className="text-oxford hover:underline">
                {l.full_name}
              </Link>
            ) : (
              <span key={l.id}>{l.full_name}</span>
            )
          )}
        </span>
      ),
    });
  if (profile.skills.length)
    details.push({
      label: "Skills",
      value: (
        <span className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span key={s} className="rounded bg-stone px-2 py-0.5 text-sm font-semibold">
              {s}
            </span>
          ))}
        </span>
      ),
    });
  if (profile.interests.length)
    details.push({
      label: "Interests",
      value: (
        <span className="flex flex-wrap gap-2">
          {profile.interests.map((s) => (
            <span key={s} className="rounded bg-powder px-2 py-0.5 text-sm font-semibold text-navy">
              {s}
            </span>
          ))}
        </span>
      ),
    });
  if (companies.length)
    details.push({
      label: companies.length === 1 ? "Company" : "Companies",
      value: (
        <span className="flex flex-wrap gap-x-3">
          {companies.map((c) => (
            <Link key={c.slug} href={`/companies/${c.slug}`} className="text-oxford hover:underline">
              {c.name}
            </Link>
          ))}
        </span>
      ),
    });
  if (profile.linkedin_url)
    details.push({
      label: "LinkedIn",
      value: (
        <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-oxford hover:underline">
          {profile.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
    });

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-4xl px-6 pb-24">
        <nav className="py-4 text-sm">
          <Link href="/" className="text-oxford underline">Home</Link>
          <span className="mx-1 text-steel">›</span>
          <Link href="/people" className="text-oxford underline">People</Link>
          <span className="mx-1 text-steel">›</span>
          <span className="text-midnight">{profile.full_name}</span>
        </nav>

        <h1 className="display-serif py-8 text-center text-6xl sm:text-7xl">
          {profile.full_name}
        </h1>

        {isOwnProfile && (
          <p className="mb-6 text-center">
            <Link
              href="/settings/profile"
              className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
            >
              Edit profile
            </Link>
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-[220px_1fr]">
          <div>
            <span className="block aspect-square w-full max-w-[220px] overflow-hidden bg-powder">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={profile.full_name ?? ""} className="h-full w-full object-cover grayscale" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-6xl font-bold text-navy">
                  {(profile.full_name ?? "?").charAt(0)}
                </span>
              )}
            </span>
            <div className="mt-3 flex items-center gap-2">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-8 w-8 items-center justify-center bg-navy text-xs font-bold text-white"
                >
                  in
                </a>
              )}
              <span className="flex h-8 w-8 items-center justify-center bg-navy text-[10px] font-bold text-white">
                ΣΗΠ
              </span>
            </div>
          </div>

          <div className="text-[17px] leading-8 text-midnight">
            {profile.bio ? (
              <p>{profile.bio}</p>
            ) : (
              <p className="text-slate-blue">
                No bio yet{profile.full_name ? ` — ${profile.full_name.split(" ")[0]} hasn't written one` : ""}.
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------- vertical details */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-midnight">Details</h2>
          <dl className="mt-4 divide-y divide-stone border-t border-b border-stone">
            {details.map((d) => (
              <div key={d.label} className="grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-[200px_1fr]">
                <dt className="font-bold text-steel">{d.label}</dt>
                <dd className="text-midnight">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
