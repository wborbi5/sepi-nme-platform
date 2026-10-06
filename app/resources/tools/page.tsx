import SiteNav from "@/components/SiteNav";
import { getNavSession } from "@/lib/data";

export const metadata = { title: "Tools — SEPi Portal" };

const ICON = "https://cdn.jsdelivr.net/npm/simple-icons@16.34.0/icons";

const TOOLS = [
  {
    name: "Cursor",
    blurb: "AI coding",
    href: "https://cursor.com",
    icon: "cursor",
  },
  {
    name: "Claude",
    blurb: "writing, research, planning",
    href: "https://claude.ai",
    icon: "claude",
  },
  {
    name: "ChatGPT",
    blurb: "writing, research, planning",
    href: "https://chatgpt.com",
    icon: "openai",
  },
  {
    name: "Notion",
    blurb: "docs, NME, ops",
    href: "https://www.notion.so",
    icon: "notion",
  },
  {
    name: "Figma",
    blurb: "product + marketing design",
    href: "https://www.figma.com",
    icon: "figma",
  },
  {
    name: "Supabase",
    blurb: "backend / auth / DB",
    href: "https://supabase.com",
    icon: "supabase",
  },
  {
    name: "Vercel",
    blurb: "ship web apps fast",
    href: "https://vercel.com",
    icon: "vercel",
  },
  {
    name: "Stripe",
    blurb: "payments",
    href: "https://stripe.com",
    icon: "stripe",
  },
  {
    name: "Calendly",
    blurb: "booking mentors / customers",
    href: "https://calendly.com",
    icon: "calendly",
  },
  {
    name: "Loom",
    blurb: "demos and async updates",
    href: "https://www.loom.com",
    icon: "loom",
  },
];

export default async function ToolsPage() {
  const nav = await getNavSession();

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <h1 className="display-serif py-14 text-center text-5xl sm:text-6xl">
          Tools
        </h1>
        <p className="mx-auto max-w-xl text-center text-lg leading-8 text-slate-blue">
          Tools SEPi members use to build and run companies.
        </p>

        <a
          href="https://startupready.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-12 flex min-h-[44px] flex-col gap-5 rounded-xl border-2 border-navy bg-paper p-6 hover:bg-cream sm:flex-row sm:items-center sm:gap-8 sm:p-8"
        >
          {/* Logo served by startupready.ai (square mark / favicon). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://umsousercontent.com/lib_oZDgpsROrdeGNzbh/7a3ibnnnqq2qxhmp.png?w=160&h=160"
            alt="Startup.Ready. logo"
            width={80}
            height={80}
            className="h-20 w-20 shrink-0"
          />
          <span>
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-blue">
              Featured
            </span>
            <h2 className="display-serif mt-1 text-3xl leading-tight sm:text-4xl">
              Startup.Ready.
            </h2>
            <p className="mt-3 text-[17px] leading-8 text-midnight">
              Full-scale guide for building your company and understanding the
              gates. Free Startup Readiness Score across six pillars (Founder,
              Problem, Market, Business Model, Go-to-Market, Financial), then
              worksheets to close your gaps.
            </p>
            <span className="mt-3 block text-sm leading-6 text-slate-blue">
              Dr. Shaun Digan / Startup.Ready.
            </span>
          </span>
        </a>

        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.name}>
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-4 rounded-xl border border-stone bg-paper px-4 py-4 hover:bg-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ICON}/${tool.icon}.svg`}
                  alt={`${tool.name} logo`}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0"
                />
                <span>
                  <span className="display-serif block text-2xl leading-tight">
                    {tool.name}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-blue">
                    {tool.blurb}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
