"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Seal from "@/components/Seal";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/companies";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // No domain check here — login is invite-only server-side
    // (shouldCreateUser: false), and admin accounts may be non-Miami.
    setState("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // invite-only — no open signup
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && /signups not allowed|not found/i.test(err.message)
          ? "This email hasn't been invited yet. Ask an officer for an invite."
          : "Couldn't send the link. Check the email and try again."
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <Link href="/" aria-label="Back to home">
        <Seal size={56} />
      </Link>
      <h1 className="display-serif mt-8 text-5xl">Sign up</h1>
      <p className="mt-4 max-w-sm text-center text-slate-blue">
        SEPi Portal is invite-only. Enter your Miami email and we&rsquo;ll send
        you a magic link — no password.
      </p>

      {state === "sent" ? (
        <p className="mt-8 max-w-sm text-center font-semibold text-navy">
          Check your inbox — your sign-in link is on the way.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@miamioh.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="btn w-full rounded-full bg-navy px-6 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {state === "error" && (
            <p className="text-center text-sm font-semibold text-[#b91c1c]">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
