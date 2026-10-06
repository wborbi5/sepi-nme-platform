import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";

export const metadata = { title: "Requests for Startups — SEPi Portal" };

const IDEAS = [
  {
    title: "AI tutor for young kids",
    body: "An app that teaches kids reading, writing, and math like a patient private tutor. Sell it to parents, not schools.",
    source: "YC RFS Fall 2026 · The Primer",
  },
  {
    title: "AI that handles company compliance",
    body: "Software that watches regulations and flags what a small business needs to renew or fix, instead of spreadsheets and lawyers.",
    source: "YC RFS Fall 2026 · AI-Native Compliance Infrastructure",
  },
];

export default async function RequestsForStartupsPage() {
  const nav = await getNavSession();

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-5xl sm:text-6xl">
          Requests for Startups
        </h1>
        <p className="mx-auto max-w-xl text-center text-lg leading-8 text-slate-blue">
          Ideas from YC&rsquo;s Requests for Startups that a SEPi member could
          take on.
        </p>

        <ol className="mt-12 space-y-4">
          {IDEAS.map((idea, i) => (
            <li
              key={idea.title}
              className="rounded-xl border border-stone bg-paper px-5 py-5 sm:px-6"
            >
              <p className="text-sm font-bold text-slate-blue">{i + 1}</p>
              <h2 className="display-serif mt-1 text-2xl sm:text-3xl">
                {idea.title}
              </h2>
              <p className="mt-3 text-[17px] leading-8 text-midnight">
                {idea.body}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-blue">
                {idea.source}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
