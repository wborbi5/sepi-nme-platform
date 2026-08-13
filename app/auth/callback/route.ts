import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Exchanges the code for a session and hands off.
 *
 * Where it hands off to is decided by middleware, not here: an account with no
 * `onboarded_at` gets pulled to /onboarding on the very next request, and an
 * onboarded one goes straight where it was headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = next && next.startsWith("/") ? next : "/";

  if (!code) {
    const errorDescription =
      searchParams.get("error_description") ?? "That link is invalid or has expired.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The database trigger raises for an email that is not on the roster, and
    // that surfaces here. Say the useful thing rather than the Postgres thing.
    const message = /member list|not allowed|42501/i.test(error.message)
      ? "That email is not on the member list. Ask an admin to add it."
      : "That link is invalid or has expired. Request a new one.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
