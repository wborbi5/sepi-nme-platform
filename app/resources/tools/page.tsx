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

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
