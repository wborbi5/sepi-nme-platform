"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { postLoginPath } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";

/*
 * Invite and magic-link emails can land with the session in the URL hash
 * (#access_token=...) or with an error fragment. The hash never reaches
 * the server. This stores a session when one is present, and turns an
 * error fragment into a plain /login message instead of throwing.
 */

function readHash(): URLSearchParams | null {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;
  try {
    return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  } catch {
    return null;
  }
}

function hashErrorCode(params: URLSearchParams): string | null {
  const blob = `${params.get("error_code") ?? ""} ${params.get("error") ?? ""} ${params.get("error_description") ?? ""}`;
  if (!params.get("error") && !params.get("error_code") && !params.get("error_description")) {
    return null;
  }
  if (/expired/i.test(blob)) return "expired";
  if (/verifier|pkce/i.test(blob)) return "pkce";
  return "link";
}

export default function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const params = readHash();
    if (!params) return;

    const next = new URLSearchParams(window.location.search).get("next");
    const errorCode = hashErrorCode(params);
    if (errorCode) {
      const url = new URL("/login", window.location.origin);
      url.searchParams.set("error", errorCode);
      if (next && next.startsWith("/") && !next.startsWith("//")) url.searchParams.set("next", next);
      window.history.replaceState(null, "", url.pathname + url.search);
      router.replace(url.pathname + url.search);
      return;
    }

    if (!params.get("access_token")) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      router.replace("/login?error=link");
      return;
    }

    let started = false;
    const go = () => {
      if (started || cancelled) return;
      started = true;
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      void postLoginPath(next)
        .then((dest) => {
          if (!cancelled) router.replace(dest);
        })
        .catch(() => {
          if (!cancelled) router.replace("/login?error=link");
        });
    };

    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) go();
      });
      void supabase.auth.getSession().then(({ data: sessionData }) => {
        if (sessionData.session) go();
      }).catch(() => {
        if (!cancelled) router.replace("/login?error=link");
      });
      return () => {
        cancelled = true;
        data.subscription.unsubscribe();
      };
    } catch {
      router.replace("/login?error=link");
    }
  }, [router]);

  return null;
}
