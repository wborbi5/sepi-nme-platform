"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("That does not look like an email address."),
  mode: z.enum(["login", "signup"]),
  next: z.string().optional(),
});

export type AccessState = {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
};

/**
 * The only door into the app.
 *
 * The allowlist check happens here, with the service role, before any auth call
 * is made. The `handle_new_auth_user` trigger repeats the check in the database
 * and aborts the insert if it fails — so an email that is not on the roster
 * cannot get an account even if this action were bypassed entirely.
 */
export async function requestAccess(
  _prev: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    mode: formData.get("mode"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check that email." };
  }

  const { email, mode, next } = parsed.data;

  const admin = createAdminClient();

  const { data: entry, error: lookupError } = await admin
    .from("allowed_emails")
    .select("email, claimed_at")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { status: "error", message: "Could not reach the member list. Try again." };
  }

  if (!entry) {
    return {
      status: "error",
      message: "That email is not on the member list. Ask an admin to add it.",
    };
  }

  // Wrong tab is not a reason to stop someone — the link does the right thing
  // either way. Say so rather than bouncing them back a screen.
  const wrongTab =
    (mode === "signup" && entry.claimed_at) || (mode === "login" && !entry.claimed_at);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = new URL("/auth/callback", site);
  if (next && next.startsWith("/")) redirectTo.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "sent",
    email,
    message: wrongTab
      ? mode === "signup"
        ? "You already have an account — the link will log you in."
        : "First time here — the link will set you up."
      : undefined,
  };
}
