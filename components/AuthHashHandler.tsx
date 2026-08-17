"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/*
 * Invite and magic-link emails can land with the session in the URL hash
 * (#access_token=...). The browser client parses and stores it; this
 * component triggers that on any page, cleans the URL, and re-renders
 * the server tree so the nav flips to the signed-in state.
 */
export default function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const hash = window.location.hash;
    if (!hash.includes("access_token=") && !hash.includes("error=")) return;

    const supabase = createClient(); // detectSessionInUrl stores the session
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
}
