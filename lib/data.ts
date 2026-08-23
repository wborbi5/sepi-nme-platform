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
  resume_parsed: import("@/lib/resume-parser").ParsedResume | null;
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
      "id, slug, full_name, role, position, major, grad_year, pledge_class, skills, interests, bio, linkedin_url, resume_path, resume_parsed, avatar_path, big_id"
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
  fullName: string | null;
  slug: string | null;
  isAdmin: boolean;
  userId: string | null;
  /** null unless the viewer can invest and the window is open */
  balance: number | null;
  notifications: NotificationRow[];
  unreadCount: number;
};

const EMPTY_NAV: NavSession = {
  initial: null,
  fullName: null,
  slug: null,
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
    supabase
      .from("profiles")
      .select("full_name, slug, role")
      .eq("id", user.id)
      .single(),
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
    fullName: profile?.full_name ?? null,
    slug: profile?.slug ?? null,
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

/* ------------------------------------------------------------- roll call */

export type RollCallGoal = { id: string; text: string; done: boolean };

export type RollCallColumn = {
  profileId: string;
  name: string;
  slug: string | null;
  goals: RollCallGoal[];
  checkin: {
    clockedInAt: string;
    clockedOutAt: string | null;
    location: string;
  } | null;
};

export type RollCallBoard = {
  day: string;
  columns: RollCallColumn[];
  done: number;
  total: number;
};

/*
 * One day of the board: every member with a goal or a check-in that day,
 * viewer's own column first, then alphabetical. Members with no activity
 * are absent by design — an empty column is noise in a room of 27.
 */
export async function getRollCall(
  day: string,
  viewerId: string | null
): Promise<RollCallBoard> {
  const empty: RollCallBoard = { day, columns: [], done: 0, total: 0 };
  if (!supabaseConfigured()) return empty;
  const supabase = await createClient();

  const [goalsRes, checkinsRes] = await Promise.all([
    supabase
      .from("daily_goals")
      .select("id, profile_id, text, done, created_at, profiles ( full_name, slug )")
      .eq("day", day)
      .order("created_at"),
    supabase
      .from("checkins")
      .select(
        "profile_id, clocked_in_at, clocked_out_at, location, profiles ( full_name, slug )"
      )
      .eq("day", day),
  ]);

  const byProfile = new Map<string, RollCallColumn>();
  const column = (id: string, profile: { full_name?: string | null; slug?: string | null } | null) => {
    const existing = byProfile.get(id);
    if (existing) return existing;
    const fresh: RollCallColumn = {
      profileId: id,
      name: profile?.full_name ?? "Member",
      slug: profile?.slug ?? null,
      goals: [],
      checkin: null,
    };
    byProfile.set(id, fresh);
    return fresh;
  };

  for (const g of (goalsRes.data ?? []) as any[]) {
    column(g.profile_id, g.profiles).goals.push({
      id: g.id,
      text: g.text,
      done: g.done,
    });
  }
  for (const c of (checkinsRes.data ?? []) as any[]) {
    column(c.profile_id, c.profiles).checkin = {
      clockedInAt: c.clocked_in_at,
      clockedOutAt: c.clocked_out_at,
      location: c.location,
    };
  }

  const columns = [...byProfile.values()].sort((a, b) => {
    if (a.profileId === viewerId) return -1;
    if (b.profileId === viewerId) return 1;
    return a.name.localeCompare(b.name);
  });

  const goals = columns.flatMap((c) => c.goals);
  return {
    day,
    columns,
    done: goals.filter((g) => g.done).length,
    total: goals.length,
  };
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
