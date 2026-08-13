"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";

import { requestAccess, type AccessState } from "./actions";

const INITIAL: AccessState = { status: "idle" };

function Submit({ mode }: { mode: "login" | "signup" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Sending…" : mode === "login" ? "Send login link" : "Create my account"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction] = useActionState(requestAccess, INITIAL);

  if (state.status === "sent") {
    return (
      <div className="text-center">
        <h1 className="text-[22px] text-[var(--cloud-white)]">Check your email</h1>
        <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
          Link sent to <span className="text-[var(--cloud-white)]">{state.email}</span>. It opens
          this app directly.
        </p>
        {state.message ? (
          <p className="mt-3 text-[13px] text-[var(--color-text-dim)]">{state.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {/* Two doors, one gate. Both send a magic link; both check the roster. */}
      <div
        role="tablist"
        aria-label="Log in or sign up"
        className="mb-6 grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--ink-sunken)] p-1"
      >
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-[2px] px-3 text-[13px] font-medium transition-colors",
              mode === m
                ? "bg-[var(--cloud-white)] text-[var(--midnight)]"
                : "text-[var(--color-text-muted)]",
            )}
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="mode" value={mode} />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="you@miamioh.edu"
          aria-label="Email address"
          aria-invalid={state.status === "error"}
        />

        <Submit mode={mode} />
      </form>

      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-[13px] text-[var(--color-danger)]">
          {state.message}
        </p>
      ) : (
        <p className="mt-4 text-[12px] leading-[1.5] text-[var(--color-text-dim)]">
          {mode === "login"
            ? "No password. We email you a link."
            : "Invite only. Your email has to be on the member list already."}
        </p>
      )}
    </div>
  );
}
