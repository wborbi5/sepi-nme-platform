import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { loginErrorCodeFromAuth, safeNextPath } from "@/lib/login";
import { profileNeedsOnboarding } from "@/lib/profile-form";
import { createClient } from "@/lib/supabase/server";

/*
 * Magic-link landing.
 * - PKCE: ?code=... (verifier cookie must be from the same browser)
 * - token_hash: ?token_hash=...&type=email|magiclink|invite|...
 * - raw OTP in the query: ?token=...&email=...&type=email
 * - implicit/hash tokens never reach the server. A tiny page forwards
 *   the fragment to /login, where the browser client stores the session.
 * A missing verifier (link opened in Mail, Slack, or another browser)
 * redirects to /login with a plain explanation. It does not throw.
 *
 * Supabase email templates should use token_hash, not ConfirmationURL:
 *   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink
 * Invite template: same path with type=invite.
 * Site URL: https://members.sepiatmiami.com
 */

const OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function loginRedirect(origin: string, code: string, next: string | null) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", code);
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}

function otpType(raw: string | null): EmailOtpType {
  return (OTP_TYPES.has(raw ?? "") ? raw : "email") as EmailOtpType;
}

const HASH_BRIDGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Signing in</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <p>Signing you in…</p>
  <p><a href="/login">Back to sign in</a></p>
  <script>
    (function () {
      var hash = window.location.hash || "";
      var search = new URLSearchParams(window.location.search);
      var next = search.get("next") || "";
      var login = new URL("/login", window.location.origin);
      if (next.charAt(0) === "/" && next.charAt(1) !== "/") login.searchParams.set("next", next);
      var hasSession = hash.indexOf("access_token=") !== -1;
      var hasError = hash.indexOf("error=") !== -1 || hash.indexOf("error_description=") !== -1 || hash.indexOf("error_code=") !== -1;
      if (hasSession || hasError) {
        window.location.replace(login.pathname + login.search + hash);
        return;
      }
      login.searchParams.set("error", "link");
      window.location.replace(login.pathname + login.search);
    })();
  </script>
</body>
</html>`;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  if (!code && !tokenHash && !(token && email)) {
    const errorBlob = [
      searchParams.get("error_code"),
      searchParams.get("error_description"),
      searchParams.get("error"),
    ]
      .filter(Boolean)
      .join(" ");
    if (errorBlob) {
      return loginRedirect(origin, loginErrorCodeFromAuth({ message: errorBlob }), next);
    }
    return new NextResponse(HASH_BRIDGE_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const supabase = await createClient();
    let error: { message: string; code?: string; status?: number } | null = null;

    if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code);
      error = result.error;
    } else if (tokenHash) {
      const result = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType(type),
      });
      error = result.error;
    } else if (token && email) {
      const result = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: otpType(type),
      });
      error = result.error;
    }

    if (error) {
      return loginRedirect(origin, loginErrorCodeFromAuth(error), next);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, slug")
        .eq("id", user.id)
        .maybeSingle();
      if (profileNeedsOnboarding(profile)) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }

    return NextResponse.redirect(`${origin}${safeNextPath(next)}`);
  } catch {
    return loginRedirect(origin, "link", next);
  }
}
