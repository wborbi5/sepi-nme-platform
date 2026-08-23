import Link from "next/link";
import RollCall from "@/components/RollCall";
import SiteNav from "@/components/SiteNav";
import { isDay, today } from "@/lib/day";
import { getFeed, getNavSession, getRollCall } from "@/lib/data";

export const metadata = { title: "Updates — SEPi Portal" };

/*
 * Roll Call sits on top — today's check-ins and goals, the thing people
 * open on a phone standing in the room. The feed (posts + investments)
 * runs below it, unchanged.
 */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: requested } = await searchParams;
  const todayDay = today();
  const day = isDay(requested) ? requested : todayDay;

  const [feed, nav] = await Promise.all([getFeed(), getNavSession()]);
  const board = await getRollCall(day, nav.userId);

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-5xl px-6 pb-24">
        {nav.userId && (
          <RollCall
            board={board}
            viewerId={nav.userId}
            viewerName={nav.fullName ?? "You"}
            viewerSlug={nav.slug}
            today={todayDay}
          />
        )}
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-24">
        <h1 className="display-serif pb-6 pt-14 text-center text-6xl">Updates</h1>
        {nav.userId && (
          <p className="pb-10 text-center">
            <Link
              href="/updates/new"
              className="btn inline-flex items-center rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
            >
              Post an update
            </Link>
          </p>
        )}

        {feed.length === 0 && (
          <div className="border-t border-stone pt-14 text-center">
            <p className="display-serif text-2xl text-midnight">
              The room is quiet — for now.
            </p>
            <p className="mx-auto mt-4 max-w-md text-slate-blue">
              Founder updates and investments appear here the moment they
              happen. Check back once the cohort starts building.
            </p>
          </div>
        )}

        <div className="divide-y divide-stone border-t border-stone">
          {feed.map((item) =>
            item.kind === "post" ? (
              <article key={`p-${item.id}`} className="py-10">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-steel">
                  {fmtDate(item.created_at)}
                  {item.company && (
                    <>
                      {" · "}
                      {item.companySlug ? (
                        <Link href={`/companies/${item.companySlug}`} className="text-oxford hover:underline">
                          {item.company}
                        </Link>
                      ) : (
                        item.company
                      )}
                    </>
                  )}
                </p>
                {item.title && (
                  <h2 className="display-serif mt-3 text-3xl">{item.title}</h2>
                )}
                <p className="mt-4 whitespace-pre-line text-[17px] leading-8 text-midnight">
                  {item.body}
                </p>
                {item.author && (
                  <p className="mt-4 text-sm font-semibold text-slate-blue">
                    — {item.author}
                  </p>
                )}
              </article>
            ) : (
              <div key={`i-${item.id}`} className="py-10">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-steel">
                  {fmtDate(item.created_at)} · Investment
                </p>
                <p className="mt-3 text-[19px] leading-8 text-midnight">
                  <span className="font-bold">{item.investor ?? "A member"}</span>{" "}
                  backed{" "}
                  {item.companySlug ? (
                    <Link
                      href={`/companies/${item.companySlug}`}
                      className="font-bold text-oxford hover:underline"
                    >
                      {item.company}
                    </Link>
                  ) : (
                    <span className="font-bold">{item.company}</span>
                  )}{" "}
                  for{" "}
                  <span className="font-bold text-navy">
                    ${item.amount.toLocaleString()}
                  </span>
                </p>
                <p className="mt-3 border-l-2 border-powder pl-4 text-[16px] italic leading-7 text-slate-blue">
                  &ldquo;{item.note}&rdquo;
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
