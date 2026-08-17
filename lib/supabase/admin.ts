import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";

/*
 * Service-role client + the admin gate. Server-side only — this module
 * imports "server-only" so any accidental client import fails the build.
 * The service key never carries a NEXT_PUBLIC_ prefix and never reaches
 * the browser.
 */

export function serviceRoleConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/*
 * Layer 3 of the admin protection. Reads the session, then re-verifies
 * role = 'admin' against the profiles table — not a cookie, not a
 * client-supplied value. Every admin server action calls this first.
 */
export async function requireAdmin(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw new Error("Admin role required");
  }
  return { id: user.id };
}
