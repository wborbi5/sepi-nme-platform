import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { getCompanies, getNavSession, publicStorageUrl } from "@/lib/data";

export const revalidate = 300;

export default async function HomePage() {
  const [companies, nav] = await Promise.all([
    getCompanies(),
    getNavSession(),
  ]);

  const withLogos = companies.filter((c) => c.logo_path);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SiteNav session={nav} />

      {/* ---------------------------------------------------------- cover */}
      <section className="flex min-h-[82vh] flex-col items-center px-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="display-serif not-italic text-6xl leading-[1.08] sm:text-7xl lg:text-8xl">
            <span style={{ fontStyle: "normal" }}>SEPi </span>
            <em>Portal</em>
            <sup
              className="ml-1 align-super text-[0.25em] font-normal"
              style={{ fontStyle: "normal" }}
            >
              [1]
            </sup>
          </h1>

          <div className="mt-14 max-w-md text-left">
            <p className="display-serif text-[17px] leading-7 text-midnight">
              <span style={{ fontStyle: "normal" }}>[1]</span> &ldquo;Our members think
              differently — in the way they think, build and network.&rdquo;
            </p>
            <p className="display-serif mt-3 text-right text-[16px] text-midnight">
              — Sigma Eta Pi
            </p>
          </div>
        </div>

        <a
          href="#member-companies"
          aria-label="Scroll to member companies"
          className="mb-6 flex h-11 w-11 items-center justify-center text-midnight hover:text-oxford"
        >
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden>
            <path d="M1 1l7 7 7-7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>
      </section>

      {/* --------------------------------------------- member companies */}
      <section id="member-companies" className="bg-paper py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="display-serif text-center text-4xl sm:text-5xl">
            Member Companies
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-blue">
            Built by SEPi members. This wall fills in as companies are
            submitted through the portal.
          </p>

          {withLogos.length > 0 ? (
            <div className="mt-12 grid grid-cols-2 gap-px bg-stone sm:grid-cols-3 lg:grid-cols-5">
              {withLogos.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.slug}`}
                  className="flex aspect-[3/2] items-center justify-center bg-paper p-6 hover:bg-cream"
                  title={c.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicStorageUrl("logos", c.logo_path)!}
                    alt={c.name}
                    className="max-h-16 w-auto max-w-full object-contain"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-px bg-stone sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex aspect-[3/2] items-center justify-center bg-paper"
                >
                  <span className="text-sm font-semibold tracking-wide text-mist">
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          )}

          {companies.length > 0 && (
            <p className="mt-8 text-center">
              <Link
                href="/companies"
                className="font-bold text-oxford hover:text-cobalt"
              >
                Browse all {companies.length} member companies →
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- the story */}
      <section className="py-24">
        <div className="mx-auto max-w-2xl px-6 text-[19px] leading-8 text-midnight">
          <p className="drop-cap">
            In 2025 Sigma Eta Pi developed a new model of the business
            fraternity at Miami University. Twice a year, students join an
            elite community of innovators and builders to pursue their passion
            and launch successful careers. New member education is designed so
            the people who join the class can leave with a new found set of
            skills and an unfair advantage on their peers in the way they
            think, build and network.
          </p>
        </div>

        {/* photo strip, YC-style edge-to-edge row */}
        <div className="mt-16 grid grid-cols-2 gap-2 px-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            "/photos/home-1.png",
            "/photos/home-2.png",
            "/photos/home-3.png",
            "/photos/home-4.png",
            "/photos/home-5.jpg",
          ].map((src) => (
            <span
              key={src}
              className="relative block aspect-[4/5] overflow-hidden rounded-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Sigma Eta Pi members"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-stone bg-cream py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-steel">
          <span>Sigma Eta Pi — Miami University</span>
          <span>ΣΗΠ</span>
        </div>
      </footer>
    </div>
  );
}
