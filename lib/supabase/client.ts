"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Anon key only — RLS is what stands between this and the data.
 * The service role key has no path into this file.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
