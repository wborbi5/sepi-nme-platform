import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";

/* Shared shell for the Resources pages — content lands later. */
export default async function ResourceStub({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  const nav = await getNavSession();
  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-5xl sm:text-6xl">
          {title}
        </h1>
        <p className="mx-auto max-w-xl text-center text-lg leading-8 text-slate-blue">
          {blurb}
        </p>
      </div>
    </div>
  );
}
