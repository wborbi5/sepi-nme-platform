"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Seal from "@/components/Seal";
import { postLoginPath } from "@/app/auth/actions";
import {
  LOGIN_ERROR_MESSAGES,
  loginEmailError,
  loginSendErrorMessage,
  loginVerifyErrorMessage,
  normalizeLoginEmail,
  normalizeOtpToken,
} from "@/lib/login";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") ?? "/companies";
  const queryError = params.get("error");
  const queryMessage = queryError
    ? LOGIN_ERROR_MESSAGES[queryError] ?? LOGIN_ERROR_MESSAGES.auth
    : "";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const shown = message || (phase === "form" ? queryMessage : "");

  async function sendLink(targetEmail: string) {
    const emailError = loginEmailError(targetEmail);
    if (emailError) {
      setMessage(emailError);
      return;
    }
    const normalized = normalizeLoginEmail(targetEmail);
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setEmail(normalized);
      setPhase("sent");
    } catch (err) {
      setMessage(loginSendErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await sendLink(email);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = normalizeOtpToken(code);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizeLoginEmail(email),
        token: parsed.token,
        type: "email",
      });
      if (error) throw error;
      router.replace(await postLoginPath(next));
    } catch (err) {
      setMessage(loginVerifyErrorMessage(err));
      setBusy(false);
    }
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

      {phase === "sent" ? (
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <p className="font-semibold text-navy">
            Check your inbox for the sign-in link.
          </p>
          <p className="text-sm text-slate-blue">
            Sent to <span className="font-semibold text-midnight">{email}</span>.
            It expires in a few minutes and works once. Open it in this browser
            if you can.
          </p>
          <form onSubmit={submitCode} className="flex w-full flex-col gap-3 text-left">
            <label className="text-sm font-semibold text-midnight" htmlFor="otp">
              Or enter the code from the email
            </label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6–8 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn w-full rounded-full bg-navy px-6 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
            >
              {busy ? "Checking…" : "Sign in with code"}
            </button>
          </form>
          {shown && (
            <p role="alert" className="text-center text-sm font-semibold text-[#b91c1c]">
              {shown}
            </p>
          )}
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
              setPhase("form");
              setMessage("");
              setCode("");
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
            type="text"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="you@miamioh.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn w-full rounded-full bg-navy px-6 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
          >
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          {shown && (
            <p role="alert" className="text-center text-sm font-semibold text-[#b91c1c]">
              {shown}
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
