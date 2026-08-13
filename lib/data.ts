import "server-only";

import { PROFILE_COLUMNS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  AppSettings,
  Company,
  CompanyTotals,
  MemberCard,
  Notification,
  Post,
  Profile,
  Todo,
} from "@/lib/types";

/** One source of truth for "what do I owe". Always the function, never a cache. */
export async function getTodos(profileId: string): Promise<Todo[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("todos_for", { target: profileId });
  return (data as Todo[] | null) ?? [];
}

export async function getUnreadCount(profileId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profileId)
    .is("read_at", null);
  return count ?? 0;
}

export async function getNotifications(profileId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Notification[] | null) ?? [];
}

export async function getSettings(): Promise<AppSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  return (data as AppSettings | null) ?? null;
}

export async function getProfileBySlug(slug: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getMemberCards(): Promise<MemberCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("member_card").select("*").order("full_name");
  return (data as MemberCard[] | null) ?? [];
}

/** Companies a person is on, with money attached. Used on every profile. */
export async function getCompaniesFor(
  profileId: string,
): Promise<(Company & { raised: number; backer_count: number; role: string | null })[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("company_members")
    .select("role, company_id, companies(*)")
    .eq("profile_id", profileId);

  const rows = (memberships ?? []) as unknown as {
    role: string | null;
    company_id: string;
    companies: Company | null;
  }[];

  const companies = rows.filter((r) => r.companies);
  if (companies.length === 0) return [];

  const { data: totals } = await supabase
    .from("company_totals")
    .select("*")
    .in(
      "company_id",
      companies.map((r) => r.company_id),
    );

  const byId = new Map(
    ((totals as CompanyTotals[] | null) ?? []).map((t) => [t.company_id, t]),
  );

  return companies.map((r) => ({
    ...(r.companies as Company),
    role: r.role,
    raised: byId.get(r.company_id)?.raised ?? 0,
    backer_count: byId.get(r.company_id)?.backer_count ?? 0,
  }));
}

/** The home feed. Chapter-wide posts only — company updates live on companies. */
export async function getFeed(role: Profile["role"], limit = 40): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .is("company_id", null)
    .in("audience", ["all", role])
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as Post[] | null) ?? [];
}
