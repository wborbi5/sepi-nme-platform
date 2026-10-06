import SiteNav from "@/components/SiteNav";
import AddMentorForm from "@/components/AddMentorForm";
import { getMentors, getNavSession } from "@/lib/data";

export const metadata = { title: "Mentor Directory — SEPi Portal" };

const LINKEDIN_ICON =
  "https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/icons/linkedin.svg";

export default async function MentorDirectoryPage() {
  const [nav, mentors] = await Promise.all([getNavSession(), getMentors()]);

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-5xl sm:text-6xl">
          Mentor Directory
        </h1>
        <p className="mx-auto max-w-xl text-center text-lg leading-8 text-slate-blue">
          Alumni and operators willing to take a meeting. Add someone with
          their LinkedIn link.
        </p>

        {nav.userId ? (
          <AddMentorForm />
        ) : (
          <p className="mt-10 text-center text-slate-blue">
            Sign in to add a mentor.
          </p>
        )}

        {mentors.length === 0 ? (
          <p className="mt-12 text-center text-[17px] leading-8 text-midnight">
            No mentors yet — add the first with a LinkedIn link.
          </p>
        ) : (
          <ul className="mt-12 space-y-3">
            {mentors.map((mentor) => {
              const name =
                mentor.display_name?.trim() ||
                mentor.linkedin_slug ||
                "Mentor";
              return (
                <li key={mentor.id}>
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] items-center gap-4 rounded-xl border border-stone bg-paper px-4 py-4 hover:bg-cream"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={LINKEDIN_ICON}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0"
                    />
                    <span className="display-serif text-2xl leading-tight">
                      {name}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
