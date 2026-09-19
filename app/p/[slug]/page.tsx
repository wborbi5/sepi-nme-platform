import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import {
  getProfiles,
  getNavSession,
  publicStorageUrl,
} from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { signOut } from "@/app/auth/actions";

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
  // Profiles without a slug yet are linked by id from /people.
  if (!profile && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)) {
    profile = profiles.find((p) => p.id === slug) ?? null;
  }

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

  // Raw PDF: private bucket, so the server mints a short-lived signed
  // URL while rendering (spec: members reach resumes this way; the page
  // itself is already behind the auth wall).
  const parsed = profile.resume_parsed;
  let resumeUrl: string | null = null;
  if (profile.resume_path && serviceRoleConfigured()) {
    const service = createServiceClient();
    const { data: signed } = await service.storage
      .from("resumes")
      .createSignedUrl(profile.resume_path, 3600);
    resumeUrl = signed?.signedUrl ?? null;
  }
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
          <div className="mb-6 flex items-center justify-center gap-3">
            <Link
              href="/settings/profile"
              className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
            >
              Edit profile
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="btn cursor-pointer rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-steel hover:bg-cream hover:text-midnight"
              >
                Sign out
              </button>
            </form>
          </div>
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
            {profile.linkedin_url && (
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-8 w-8 items-center justify-center bg-navy text-xs font-bold text-white"
                >
                  in
                </a>
              </div>
            )}
          </div>

          <div className="text-[17px] leading-8 text-midnight">
            {profile.bio ? (
              <p className="whitespace-pre-line">{profile.bio}</p>
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

        {/* --------------------------------------------- parsed resume */}
        {(parsed?.status === "done" || resumeUrl) && (
          <section className="mt-16">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-midnight">Resume</h2>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
                >
                  View full resume (PDF)
                </a>
              )}
            </div>

            {parsed?.status === "done" && (
              <>
                {parsed.summary && (
                  <p className="mt-5 border-l-2 border-navy pl-4 text-[17px] leading-8 text-midnight">
                    {parsed.summary}
                  </p>
                )}

                {(parsed.experience?.length ?? 0) > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-steel">
                      Experience
                    </h3>
                    <div className="mt-3 divide-y divide-stone border-t border-b border-stone">
                      {parsed.experience!.map((job, i) => (
                        <div key={i} className="py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                            <p className="font-bold text-midnight">
                              {job.title}
                              {job.organization && (
                                <span className="font-semibold text-oxford">
                                  {" "}· {job.organization}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-steel">
                              {[job.start_date, job.end_date].filter(Boolean).join(" — ")}
                              {job.location ? ` · ${job.location}` : ""}
                            </p>
                          </div>
                          {(job.highlights?.length ?? 0) > 0 && (
                            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-6 text-midnight">
                              {job.highlights!.map((h, j) => (
                                <li key={j}>{h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(parsed.skills?.length ?? 0) > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-steel">
                      Skills from their resume
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parsed.skills!.map((s) => (
                        <span key={s} className="rounded bg-stone px-2.5 py-1 text-sm font-semibold text-midnight">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(parsed.education?.length ?? 0) > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-steel">
                      Education
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      {parsed.education!.map((ed, i) => (
                        <p key={i} className="text-[15px] text-midnight">
                          <b>{ed.institution}</b>
                          {ed.degree ? ` — ${ed.degree}` : ""}
                          {ed.grad_year ? `, ${ed.grad_year}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
