import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Everything else is auth-walled. There are no public pages in this app. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/signout"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser, not getSession: this revalidates the JWT against Supabase rather
  // than trusting a cookie that anyone could have written.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublic(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Come back to where they were headed once they are through the door.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in and sitting on the login screen — send them inside.
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // One roundtrip for the two things middleware needs to know: has this person
  // finished onboarding, and are they an admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, role, is_active")
    .eq("id", user.id)
    .single();

  const onboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  // First time in: straight to onboarding. Every time after: straight inside.
  if (profile && !profile.onboarded_at && !onboarding) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (profile?.onboarded_at && onboarding) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Layer 1 of 3. RLS and the server-action role check are the other two.
  if (pathname.startsWith("/admin") && profile?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
