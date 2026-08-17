import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import InvestSheet from "@/components/InvestSheet";
import {
  getCompanyBySlug,
  getNavSession,
  publicStorageUrl,
} from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { respondToInvestment } from "@/app/invest/actions";

/*
 * Company page in the YC company-profile layout: breadcrumb, header with
 * logo + tags, long description on the left, detail card + founders on
 * the right rail.
 */

const STRATEGY_BLOCKS: { key: string; label: string }[] = [
  { key: "revenue_model", label: "Revenue model" },
  { key: "target_audience", label: "Target audience" },
  { key: "competitive_advantage", label: "Competitive advantage" },
  { key: "timing", label: "Why now" },
  { key: "customer_acquisition", label: "Customer acquisition" },
  { key: "milestones", label: "Milestones" },
];

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [company, nav] = await Promise.all([
    getCompanyBySlug(slug),
    getNavSession(),
  ]);
  if (!company) notFound();

  // Public application answers, backers, viewer eligibility, founder view
  let answers: Record<string, string | null> = {};
  let backers: { name: string | null; amount: number; note: string }[] = [];
  let pendings: { id: string; amount: number; note: string; investor: string | null; created_at: string }[] = [];
  let isTeamMember = false;
  let canInvest = false;
  let settings: { investment_min: number; investment_max: number } | null = null;
  let viewerBalance = 0;
  let topRaised = 0;
  let updates: { id: string; title: string; body: string; published_at: string; author: string | null }[] = [];

  if (supabaseConfigured()) {
    const supabase = await createClient();
    const [appRes, invRes, memberRes, settingsRes, totalsRes, postsRes] =
      await Promise.all([
        supabase
          .from("application_public")
          .select("*")
          .eq("company_id", company.id)
          .order("pass_number", { ascending: false })
          .limit(1),
        supabase
          .from("investments")
          .select(
            "id, amount, note, status, created_at, profiles!investments_investor_id_fkey ( full_name )"
          )
          .eq("company_id", company.id)
          .in("status", ["accepted", "pending"])
          .order("amount", { ascending: false }),
        nav.userId
          ? supabase
              .from("company_members")
              .select("profile_id")
              .eq("company_id", company.id)
              .eq("profile_id", nav.userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("app_settings")
          .select("investment_window_open, investment_min, investment_max")
          .eq("id", 1)
          .single(),
        supabase.from("company_totals").select("raised").order("raised", { ascending: false }).limit(1),
        supabase
          .from("posts")
          .select("id, title, body, published_at, profiles ( full_name )")
          .eq("company_id", company.id)
          .order("published_at", { ascending: false })
          .limit(10),
      ]);

    if (appRes.data?.[0]) answers = appRes.data[0];
    const allInv = (invRes.data ?? []) as any[];
    backers = allInv
      .filter((i) => i.status === "accepted")
      .map((i) => ({
        name: i.profiles?.full_name ?? null,
        amount: i.amount,
        note: i.note,
      }));
    isTeamMember = Boolean(memberRes.data);
    topRaised = (totalsRes.data?.[0] as { raised?: number } | undefined)?.raised ?? 0;
    updates = (postsRes.data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      published_at: p.published_at,
      author: p.profiles?.full_name ?? null,
    }));

    // Founders (and admins) see the pending queue with respond buttons.
    if (isTeamMember || nav.isAdmin) {
      pendings = allInv
        .filter((i) => i.status === "pending")
        .map((i) => ({
          id: i.id,
          amount: i.amount,
          note: i.note,
          investor: i.profiles?.full_name ?? null,
          created_at: i.created_at,
        }));
    }

    // Invest button eligibility — mirror of the Postgres rules for UI
    // only; place_investment() re-checks every one of them.
    const s = settingsRes.data;
    settings = s
      ? { investment_min: s.investment_min, investment_max: s.investment_max }
      : null;
    if (
      nav.userId &&
      s?.investment_window_open &&
      company.investable &&
      !isTeamMember
    ) {
      const [{ data: bal }, { data: mine }] = await Promise.all([
        supabase.rpc("available_balance", { investor: nav.userId }),
        supabase
          .from("investments")
          .select("id")
          .eq("company_id", company.id)
          .eq("investor_id", nav.userId)
          .maybeSingle(),
      ]);
      viewerBalance = typeof bal === "number" ? bal : 0;
      canInvest = !mine && viewerBalance > 0 && nav.balance !== null;
    }
  }

  const logoUrl = publicStorageUrl("logos", company.logo_path);
  const totalRaised = backers.reduce((s, b) => s + b.amount, 0);
  const raisePct =
    topRaised > 0 ? Math.min(100, Math.round((totalRaised / topRaised) * 100)) : 0;
  const pledgeClasses = [
    ...new Set(company.founders.map((f) => f.pledge_class).filter(Boolean)),
  ];

  const tag =
    "rounded bg-stone px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-midnight";

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <div className="mx-auto max-w-6xl px-4 pb-24">
        <nav className="py-4 text-sm text-oxford">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1 text-steel">›</span>
          <Link href="/companies" className="hover:underline">Companies</Link>
          <span className="mx-1 text-steel">›</span>
          <span className="text-midnight">{company.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          {/* ------------------------------------------------ main column */}
          <div>
            <div className="flex items-start gap-5">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone bg-paper">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-mist">
                    {company.name.charAt(0)}
                  </span>
                )}
              </span>
              <div>
                <h1 className="text-3xl font-extrabold text-midnight">
                  {company.name}
                </h1>
                <p className="mt-1 text-lg text-midnight">{company.one_liner}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pledgeClasses.map((pc) => (
                    <span key={pc} className={tag}>
                      <span className="mr-1 inline-flex h-4 w-4 items-center justify-center bg-navy align-[-2px] text-[9px] font-bold text-white">
                        Σ
                      </span>
                      {pc}
                    </span>
                  ))}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                      company.status === "active"
                        ? "bg-[#dcfce7] text-[#15803d]"
                        : "bg-stone text-steel"
                    }`}
                  >
                    {company.status}
                  </span>
                  {company.industry && <span className={tag}>{company.industry}</span>}
                </div>
              </div>
            </div>

            {/* raise bar + invest — investable companies only */}
            {company.investable && (
              <div className="mt-8 rounded-xl border border-stone bg-paper p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-midnight">
                    ${totalRaised.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-steel">
                    {backers.length} backer{backers.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-stone">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${raisePct}%` }}
                    aria-label={`${raisePct}% of the top-raised company`}
                  />
                </div>
                {canInvest && settings && (
                  <div className="mt-5">
                    <InvestSheet
                      companyId={company.id}
                      companyName={company.name}
                      min={settings.investment_min}
                      max={settings.investment_max}
                      balance={viewerBalance}
                    />
                  </div>
                )}
              </div>
            )}

            {/* founder view: pending investments needing a response */}
            {pendings.length > 0 && (
              <div className="mt-6 rounded-xl border border-[#e0c000] bg-[#fffbeb] p-5">
                <h2 className="text-lg font-extrabold text-midnight">
                  Pending investments — respond within 72 hours
                </h2>
                <div className="mt-3 space-y-4">
                  {pendings.map((p) => (
                    <div key={p.id} className="border-t border-stone pt-3 first:border-t-0 first:pt-0">
                      <p className="font-bold text-midnight">
                        {p.investor ?? "Member"} · ${p.amount.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[15px] leading-6 text-midnight">
                        &ldquo;{p.note}&rdquo;
                      </p>
                      <div className="mt-3 flex gap-2">
                        <form action={respondToInvestment}>
                          <input type="hidden" name="investment_id" value={p.id} />
                          <input type="hidden" name="decision" value="accepted" />
                          <button className="btn cursor-pointer rounded-full border-0 bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-oxford">
                            Accept
                          </button>
                        </form>
                        <form action={respondToInvestment}>
                          <input type="hidden" name="investment_id" value={p.id} />
                          <input type="hidden" name="decision" value="declined" />
                          <button className="btn cursor-pointer rounded-full border border-coolgray bg-paper px-6 py-2.5 text-sm font-bold text-midnight hover:bg-cream">
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-b border-stone pb-3">
              <div className="flex items-center gap-4">
                <span className="font-bold text-midnight">Company</span>
                {(isTeamMember || nav.isAdmin) && (
                  <Link
                    href={`/companies/${company.slug}/apply`}
                    className="text-sm font-semibold text-oxford hover:underline"
                  >
                    Accelerator Application →
                  </Link>
                )}
              </div>
              {company.website_url && (
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-oxford hover:underline"
                >
                  {company.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {STRATEGY_BLOCKS.filter((b) => answers[b.key]).map((b) => (
                <div key={b.key}>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-steel">
                    {b.label}
                  </h2>
                  <p className="mt-1 leading-7 text-midnight">
                    {String(answers[b.key])}
                  </p>
                </div>
              ))}
              {STRATEGY_BLOCKS.every((b) => !answers[b.key]) && (
                <p className="text-slate-blue">
                  This company hasn&rsquo;t submitted its Accelerator
                  Application yet. Its story will appear here.
                </p>
              )}
            </div>

            {/* backers */}
            {backers.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-extrabold text-midnight">
                  Backers · ${totalRaised.toLocaleString()} raised
                </h2>
                <div className="mt-4 space-y-4">
                  {backers.map((b, i) => (
                    <div key={i} className="rounded-lg border border-stone bg-paper p-4">
                      <p className="font-bold text-midnight">
                        {b.name ?? "Member"}{" "}
                        <span className="font-semibold text-navy">
                          · ${b.amount.toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-1 text-[15px] leading-6 text-midnight">
                        &ldquo;{b.note}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* assets strip */}
            {(company.demo_url || company.website_url) && (
              <div className="mt-10 flex flex-wrap gap-3">
                {company.demo_url && (
                  <a
                    href={company.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
                  >
                    Demo ↗
                  </a>
                )}
                {company.website_url && (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
                  >
                    Website ↗
                  </a>
                )}
              </div>
            )}

            {/* company updates */}
            {updates.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-extrabold text-midnight">Updates</h2>
                <div className="mt-4 space-y-6">
                  {updates.map((u) => (
                    <div key={u.id} className="border-t border-stone pt-4">
                      <p className="text-sm text-steel">
                        {new Date(u.published_at).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {u.author ? ` · ${u.author}` : ""}
                      </p>
                      <h3 className="mt-1 font-bold text-midnight">{u.title}</h3>
                      <p className="mt-1 whitespace-pre-line leading-7 text-midnight">
                        {u.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------- right rail */}
          <aside>
            <div className="rounded-xl border border-stone bg-paper p-6 text-center shadow-sm">
              <span className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-stone bg-cream">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-mist">
                    {company.name.charAt(0)}
                  </span>
                )}
              </span>
              <h2 className="mt-4 text-xl font-extrabold text-midnight">
                {company.name}
              </h2>
              <dl className="mt-5 space-y-2 text-left text-[15px]">
                {company.founded_year && (
                  <div className="flex justify-between">
                    <dt className="text-steel">Founded:</dt>
                    <dd className="font-semibold text-midnight">{company.founded_year}</dd>
                  </div>
                )}
                {pledgeClasses.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-steel">Pledge class:</dt>
                    <dd className="font-semibold text-midnight">
                      {pledgeClasses.join(", ")}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-steel">Team size:</dt>
                  <dd className="font-semibold text-midnight">
                    {company.founders.length || "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-steel">Status:</dt>
                  <dd className="font-semibold capitalize text-midnight">{company.status}</dd>
                </div>
                {company.industry && (
                  <div className="flex justify-between">
                    <dt className="text-steel">Industry:</dt>
                    <dd className="font-semibold text-midnight">{company.industry}</dd>
                  </div>
                )}
                {totalRaised > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-steel">Raised:</dt>
                    <dd className="font-semibold text-midnight">
                      ${totalRaised.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <h3 className="mt-8 text-lg font-extrabold text-midnight">Founders</h3>
            <div className="mt-3 space-y-3">
              {company.founders.map((f) => (
                <Link
                  key={f.slug ?? f.full_name}
                  href={f.slug ? `/p/${f.slug}` : "#"}
                  className="flex items-center gap-3 rounded-lg border border-stone bg-paper p-3 hover:bg-cream"
                >
                  <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-powder text-sm font-bold text-navy">
                    {f.avatar_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publicStorageUrl("avatars", f.avatar_path)!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (f.full_name ?? "?").charAt(0)
                    )}
                  </span>
                  <span>
                    <span className="block font-bold text-midnight">
                      {f.full_name}
                    </span>
                    {f.pledge_class && (
                      <span className="text-sm text-steel">
                        Pledged {f.pledge_class}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
              {company.founders.length === 0 && (
                <p className="text-sm text-slate-blue">No founders listed yet.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
