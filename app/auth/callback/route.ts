import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/companies";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, major, grad_year, slug")
          .eq("id", user.id)
          .maybeSingle();

        const incomplete =
          !profile?.full_name?.trim() ||
          !profile?.major?.trim() ||
          !profile?.grad_year ||
          !profile?.slug;

        if (incomplete) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
