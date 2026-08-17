import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";

export const metadata = { title: "What Happens at SEPi — SEPi Portal" };

/*
 * "What Happens at YC" layout: big italic serif title, sticky anchor
 * sidebar on the left, long-form content on the right. Content sourced
 * from the SEPi NME Master Hub and Philosophy pages in Notion.
 */

const SECTIONS = [
  { id: "program", label: "The NME Program" },
  { id: "philosophy", label: "Philosophy" },
  { id: "weeks", label: "The Seven Weeks" },
  { id: "community", label: "Community" },
  { id: "athena", label: "Athena 42" },
];

const WEEKS = [
  ["1", "Oct 12", "Identity and problem ownership", "What problem do you own, and how do you know it is real?"],
  ["2", "Oct 19", "Offers, sales, Money Sprint", "Can you get a stranger to pay you this week?"],
  ["3", "Oct 26", "People and tools that multiply you", "Who and what do you need that you do not have?"],
  ["4", "Nov 2", "Public stake and teardown", "Can you take real criticism and turn it into a better answer?"],
  ["5", "Nov 9", "Validate before you build", "Will anyone want this before you spend a month making it?"],
  ["6", "Nov 16", "Talk to users and iterate", "Do real users love it, who exactly are they, and what do they like about it?"],
  ["7", "Nov 23", "Pitch craft and next steps", "Can you make an audience believe in you?"],
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
            <section id="program">
              <p>
                People often ask us what happens inside Sigma Eta Pi. Here is
                an overview of New Member Education and what you get as a SEPi
                member.
              </p>
              <h2 className="display-serif mt-8 text-3xl">The NME Program</h2>
              <p className="mt-4">
                NME is a seven-week program that teaches members how to think
                like founders. It runs October 12 through November 23 and
                feeds directly into Athena 42, the capstone pitch event. One
                core idea sits under everything: our members think
                differently.
              </p>
              <p className="mt-4">
                The one thing we are actually teaching is validation. Cut the
                assumptions, prove it, then do it. Every week asks a version
                of the same question: how do you know that&rsquo;s true, and
                who told you?
              </p>
              <h3 className="mt-8 text-xl font-bold">What success looks like</h3>
              <p className="mt-3">
                Success is members who learned the process — not successful
                startups. A member who kills their idea in Week 4 because they
                validated it honestly has succeeded. Every member should
                finish able to answer three questions:
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-6">
                <li>What problem do I own, and how do I know it is real?</li>
                <li>What did I try, and what did the market tell me?</li>
                <li>What is my next step?</li>
              </ol>
              <h3 className="mt-8 text-xl font-bold">
                What every member walks away with
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>An unfair advantage in strategy and AI tools</li>
                <li>
                  An undeniable story they can tell in any room — interviews,
                  networking, and mentorship
                </li>
                <li>
                  A repeatable way to see problems and move on them faster
                  than their peers
                </li>
              </ul>
            </section>

            <section id="philosophy">
              <h2 className="display-serif text-3xl">Philosophy</h2>
              <p className="mt-4">
                Put people in uncomfortable spots with real stakes, give them
                the knowledge layer exactly when they need it, and have
                mentors and members check in as their safety net.
              </p>
              <p className="mt-4">
                The single most common founder failure is building something
                nobody asked for. NME is designed so a member cannot reach
                Week 7 without repeatedly checking their assumptions against
                reality. Validation is not a week — it is the question we ask
                every session.
              </p>
              <p className="mt-4">
                We are teaching the process, not producing startups. Nobody is
                graded on revenue or survival. Building happens on
                members&rsquo; own time, alongside mentors and the SEPi
                network — NME prioritizes how members think and approach
                problems.
              </p>
              <p className="mt-4">
                Members are treated like customers. Challenge is good; wasted
                time is not. Every block on the agenda has to answer one
                question — what does a member walk out able to do?
              </p>
            </section>

            <section id="weeks">
              <h2 className="display-serif text-3xl">The Seven Weeks</h2>
              <p className="mt-4">
                Weeks 1 to 3 are diagnosis: who you are, what problem you own,
                what you can sell, and who can help you win. Weeks 4 to 7 are
                prescription and treatment: take a public stake, validate the
                demand, build against real signal, and learn to compel an
                audience. Sessions run every Monday after Chapter.
              </p>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-[15px]">
                  <thead>
                    <tr className="border-b-2 border-midnight text-left">
                      <th className="py-2 pr-4">Week</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Theme</th>
                      <th className="py-2">Core question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKS.map(([w, d, t, q]) => (
                      <tr key={w} className="border-b border-stone align-top">
                        <td className="py-2.5 pr-4 font-bold">{w}</td>
                        <td className="py-2.5 pr-4 whitespace-nowrap">{d}</td>
                        <td className="py-2.5 pr-4 font-semibold">{t}</td>
                        <td className="py-2.5 text-slate-blue">{q}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4">
                Every member leaves every week with a specific next step and a
                deadline. Homework compounds week to week and stays under two
                hours. The Accelerator Application is completed at Weeks 1, 4,
                and 7 — the same form, three passes, so members watch their
                own answers sharpen.
              </p>
            </section>

            <section id="community">
              <h2 className="display-serif text-3xl">Community</h2>
              <p className="mt-4">
                Founding members serve as student mentors, and each new member
                is paired big/little style for accountability and validation.
                The cohort is designed to be tight enough that cofounder
                pairings emerge naturally, and current members leave knowing
                every new member on a level deeper than first name and grad
                year.
              </p>
              <p className="mt-4">
                But SEPi doesn&rsquo;t end at Week 7. The chapter and its
                mentor network continue to back members for the life of their
                ventures — and their careers — beyond.
              </p>
            </section>

            <section id="athena">
              <h2 className="display-serif text-3xl">Athena 42</h2>
              <p className="mt-4">
                The capstone. On December 4, members pitch to a real audience
                with a $10k prize pool on the line. Week 4&rsquo;s public
                teardown and the member investment window build toward it:
                founding-class members hold real (simulated) investment
                budgets and back the new-member companies they believe in,
                with every investment carrying a written note of feedback.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
