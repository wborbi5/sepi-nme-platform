import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";

export const metadata = { title: "What Happens at SEPi — SEPi Portal" };

/*
 * "What Happens at YC" layout: big italic serif title, sticky anchor
 * sidebar on the left, long-form content on the right. Public overview
 * only — no curriculum, calendar, or event internals.
 */

const SECTIONS = [
  { id: "glance", label: "At a glance" },
  { id: "nme", label: "New Member Education" },
  { id: "community", label: "Community" },
];

export default async function AboutPage() {
  const nav = await getNavSession();

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-5xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-5xl sm:text-6xl">
          What Happens at SEPi
        </h1>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-8 space-y-3 text-[15px]">
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block hover:text-cobalt ${
                    i === 0 ? "font-bold text-navy" : "text-midnight"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-16 text-[17px] leading-8 text-midnight">
            <section id="glance">
              <h2 className="display-serif text-3xl">At a glance</h2>
              <p className="mt-4">
                People often ask us what happens inside Sigma Eta Pi. New
                members learn to think and build like founders. The chapter,
                and the people in it, stay with them after that.
              </p>
            </section>

            <section id="nme">
              <h2 className="display-serif text-3xl">New Member Education</h2>
              <p className="mt-4">
                New members go through New Member Education, a hands-on
                founder education focused on validation and building. Members
                learn to test an idea in the real world and to build from
                what they find, with mentors and the chapter close by.
              </p>
            </section>

            <section id="community">
              <h2 className="display-serif text-3xl">Community</h2>
              <p className="mt-4">
                Founding members mentor new members, and the chapter is close
                enough that people know each other beyond a first name and a
                grad year. The chapter and its mentor network stay with
                members through their ventures and their careers.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
