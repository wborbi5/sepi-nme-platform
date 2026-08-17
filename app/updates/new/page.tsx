import { redirect } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import PostForm from "@/components/PostForm";
import { getNavSession } from "@/lib/data";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "New update — SEPi Portal" };

export default async function NewPostPage() {
  if (!supabaseConfigured()) redirect("/");
  const nav = await getNavSession();
  if (!nav.userId) redirect("/login?next=/updates/new");

  // Companies the author can post as: their own (admins see all).
  const supabase = await createClient();
  let companies: { id: string; name: string }[] = [];
  if (nav.isAdmin) {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    companies = data ?? [];
  } else {
    const { data } = await supabase
      .from("company_members")
      .select("companies ( id, name )")
      .eq("profile_id", nav.userId);
    companies = (data ?? []).map((r: any) => r.companies).filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />
      <div className="mx-auto max-w-xl px-6 pb-24">
        <h1 className="display-serif py-12 text-center text-5xl">
          Post an update
        </h1>
        <PostForm companies={companies} />
      </div>
    </div>
  );
}
