import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/*
 * Read-side data access for the portal pages. Every fetcher returns an
 * empty result when Supabase env vars are absent so the UI renders on a
 * fresh checkout. Nothing here touches the service role key.
 */

export type CompanyRow = {
  id: string;
  slug: string;
  name: string;
  one_liner: string;
  status: "active" | "pivoted" | "killed";
  investable: boolean;
  logo_path: string | null;
  website_url: string | null;
  demo_url: string | null;
  industry: string | null;
  founded_year: number | null;
  created_at: string;
  founders: {
    slug: string | null;
    full_name: string | null;
    pledge_class: string | null;
    avatar_path: string | null;
  }[];
};

export type ProfileRow = {
  id: string;
  slug: string | null;
  full_name: string | null;
  role: "admin" | "current_member" | "new_member";
  position: string | null;
  major: string | null;
  grad_year: number | null;
  pledge_class: string | null;
  skills: string[];
  interests: string[];
  bio: string | null;
  linkedin_url: string | null;
  resume_path: string | null;
  avatar_path: string | null;
  big_id: string | null;
};

export function publicStorageUrl(bucket: string, path: string | null) {
  if (!path || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export async function getCompanies(): Promise<CompanyRow[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `id, slug, name, one_liner, status, investable, logo_path, website_url,
       demo_url, industry, founded_year, created_at,
       company_members ( profiles ( slug, full_name, pledge_class, avatar_path ) )`
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((c: Record<string, unknown>) => ({
    ...(c as Omit<CompanyRow, "founders">),
    founders: ((c.company_members as { profiles: CompanyRow["founders"][number] }[]) ?? [])
      .map((m) => m.profiles)
      .filter(Boolean),
  }));
}

export async function getCompanyBySlug(slug: string): Promise<CompanyRow | null> {
  const companies = await getCompanies();
  return companies.find((c) => c.slug === slug) ?? null;
}

export async function getProfiles(): Promise<ProfileRow[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, slug, full_name, role, position, major, grad_year, pledge_class, skills, interests, bio, linkedin_url, resume_path, avatar_path, big_id"
    )
    .eq("is_active", true)
    .order("full_name");
  return (data as ProfileRow[]) ?? [];
}

export async function getProfileBySlug(slug: string): Promise<ProfileRow | null> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.slug === slug) ?? null;
}

export async function getSessionInitial(): Promise<string | null> {
  const { initial } = await getNavSession();
  return initial;
}

export type NotificationRow = {
  id: string;
  type: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type NavSession = {
  initial: string | null;
  isAdmin: boolean;
  userId: string | null;
  /** null unless the viewer can invest and the window is open */
  balance: number | null;
  notifications: NotificationRow[];
  unreadCount: number;
};

const EMPTY_NAV: NavSession = {
  initial: null,
  isAdmin: false,
  userId: null,
  balance: null,
  notifications: [],
  unreadCount: 0,
};

export async function getNavSession(): Promise<NavSession> {
  if (!supabaseConfigured()) return EMPTY_NAV;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_NAV;

  const [profileRes, settingsRes, notifRes, unreadRes] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    supabase
      .from("app_settings")
      .select("investment_window_open")
      .eq("id", 1)
      .single(),
    supabase
      .from("notifications")
      .select("id, type, body, link, read_at, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  const profile = profileRes.data;
  const canInvest = profile?.role === "admin" || profile?.role === "current_member";
  let balance: number | null = null;
  if (canInvest && settingsRes.data?.investment_window_open) {
    const { data } = await supabase.rpc("available_balance", { investor: user.id });
    if (typeof data === "number") balance = data;
  }

  const name = profile?.full_name || user.email || "?";
  return {
    initial: name.charAt(0),
    isAdmin: profile?.role === "admin",
    userId: user.id,
    balance,
    notifications: (notifRes.data as NotificationRow[]) ?? [],
    unreadCount: unreadRes.count ?? 0,
  };
}

export type FeedItem =
  | {
      kind: "post";
      id: string;
      created_at: string;
      author: string | null;
      company: string | null;
      companySlug: string | null;
      title: string | null;
      body: string;
    }
  | {
      kind: "investment";
      id: string;
      created_at: string;
      investor: string | null;
      company: string | null;
      companySlug: string | null;
      amount: number;
      note: string;
    };

export async function getFeed(): Promise<FeedItem[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();

  const [postsRes, investRes] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, title, body, published_at, profiles ( full_name ), companies ( name, slug )"
      )
      .order("published_at", { ascending: false })
      .limit(40),
    supabase
      .from("investments")
      .select(
        "id, amount, note, created_at, status, investor:profiles!investments_investor_id_fkey ( full_name ), companies ( name, slug )"
      )
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const posts: FeedItem[] = (postsRes.data ?? []).map((p: any) => ({
    kind: "post",
    id: p.id,
    created_at: p.published_at,
    author: p.profiles?.full_name ?? null,
    company: p.companies?.name ?? null,
    companySlug: p.companies?.slug ?? null,
    title: p.title ?? null,
    body: p.body ?? "",
  }));

  const invests: FeedItem[] = (investRes.data ?? []).map((i: any) => ({
    kind: "investment",
    id: i.id,
    created_at: i.created_at,
    investor: i.investor?.full_name ?? null,
    company: i.companies?.name ?? null,
    companySlug: i.companies?.slug ?? null,
    amount: i.amount,
    note: i.note,
  }));

  return [...posts, ...invests].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );
}

export type AppSettings = {
  investment_window_open: boolean;
  investment_min: number;
  investment_max: number;
  investor_budget: number;
};

export async function getSettings(): Promise<AppSettings | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("investment_window_open, investment_min, investment_max, investor_budget")
    .eq("id", 1)
    .single();
  return (data as AppSettings) ?? null;
}

export type CompanyTotals = { company_id: string; raised: number; backer_count: number };

export async function getCompanyTotals(): Promise<CompanyTotals[]> {
  if (!supabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("company_totals").select("*");
  return (data as CompanyTotals[]) ?? [];
}
