import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { getProfiles, getNavSession, publicStorageUrl } from "@/lib/data";
import type { ProfileRow } from "@/lib/data";

export const metadata = { title: "People — SEPi Portal" };

/*
 * YC People page: italic serif title, sections per group, each person a
 * photo + name + position + bio row.
 */

function PersonRow({ p }: { p: ProfileRow }) {
  const avatar = publicStorageUrl("avatars", p.avatar_path);
  return (
    <Link
      href={p.slug ? `/p/${p.slug}` : "#"}
      className="flex flex-col gap-4 py-8 sm:flex-row sm:gap-6"
    >
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-powder text-2xl font-bold text-navy">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          (p.full_name ?? "?").charAt(0)
        )}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-midnight">{p.full_name}</span>
        {p.position && (
          <span className="block font-semibold text-midnight">{p.position}</span>
        )}
        {p.bio && (
          <span className="mt-1 block leading-7 text-midnight">{p.bio}</span>
        )}
        {!p.bio && p.major && (
          <span className="mt-1 block text-slate-blue">
            {p.major}
            {p.grad_year ? ` · Class of ${p.grad_year}` : ""}
          </span>
        )}
      </span>
    </Link>
  );
}

export default async function PeoplePage() {
  const [profiles, nav] = await Promise.all([
    getProfiles(),
    getNavSession(),
  ]);

  const groups: { title: string; members: ProfileRow[] }[] = [
    { title: "Executive Board", members: profiles.filter((p) => p.role === "admin") },
    {
      title: "Founding Class",
      members: profiles.filter((p) => p.role === "current_member"),
    },
    {
      title: "New Members",
      members: profiles.filter((p) => p.role === "new_member"),
    },
  ].filter((g) => g.members.length > 0);

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-4xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-6xl">People</h1>

        {groups.length === 0 && (
          <p className="text-center text-slate-blue">
            Member profiles appear here once accounts are invited and filled
            out.
          </p>
        )}

        {groups.map((g) => (
          <section key={g.title} className="mb-12">
            <h2 className="border-b border-stone pb-3 text-2xl font-semibold text-midnight">
              {g.title}
            </h2>
            <div className="divide-y divide-stone">
              {g.members.map((p) => (
                <PersonRow key={p.id} p={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
