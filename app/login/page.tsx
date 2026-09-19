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

  async function sendLink(targetEmail: string) {
    setState("sending");
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && /signups not allowed|not found/i.test(err.message)
          ? "This email hasn’t been invited yet. Ask an officer for an invite."
          : "Couldn’t send the link. Check the email and try again."
      );
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await sendLink(email);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <Link href="/" aria-label="Back to home">
        <Seal size={56} />
      </Link>
      <h1 className="display-serif mt-8 text-5xl">Sign in</h1>
      <p className="mt-4 max-w-sm text-center text-slate-blue">
        Invite-only member portal. Use your Miami email and we’ll send a
        one-time magic link. No password.
      </p>

      {state === "sent" ? (
        <div className="mt-8 flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="font-semibold text-navy">
            Check your inbox for the sign-in link.
          </p>
          <p className="text-sm text-slate-blue">
            Sent to <span className="font-semibold text-midnight">{email}</span>.
            It expires in a few minutes and works once.
          </p>
          <button
            type="button"
            onClick={() => sendLink(email)}
            className="text-sm font-bold text-oxford hover:underline"
          >
            Resend link
          </button>
          <button
            type="button"
            onClick={() => {
              setState("idle");
              setMessage("");
            }}
            className="text-sm text-slate-blue hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <label className="text-left text-sm font-semibold text-midnight" htmlFor="email">
            Miami email
          </label>
          <input
            id="email"
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
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
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
