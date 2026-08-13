"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Select, Textarea } from "@/components/ui";
import { addToAllowlist, removeFromAllowlist, setMemberRole } from "@/app/actions/admin";
import type { Role } from "@/lib/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "new_member", label: "New member" },
  { value: "current_member", label: "Current member" },
  { value: "admin", label: "Admin" },
];

/** Paste a roster, pick a role, done. This is how people get in. */
export function AllowlistForm({ domain }: { domain: string }) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<Role>("new_member");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await addToAllowlist({ emails, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmails("");
      setMessage(result.message ?? "Added.");
      router.refresh();
    });
  };

  return (
    <div className="max-w-[520px] space-y-3">
      <Field
        label="Emails"
        hint={`One per line, or comma-separated. Anything outside @${domain} is skipped.`}
      >
        <Textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder={`doej@${domain}\nsmitha@${domain}`}
          className="min-h-[120px] font-mono text-[13px]"
        />
      </Field>

      <Field label="Role they get">
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>

      <Button onClick={submit} disabled={pending || !emails.trim()}>
        {pending ? "Adding…" : "Add to allowlist"}
      </Button>

      {message ? <p className="text-[13px] text-[var(--color-success)]">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveButton({ email }: { email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeFromAllowlist(email);
          router.refresh();
        })
      }
      className="min-h-0 text-[13px] text-[var(--color-danger)] disabled:opacity-40"
    >
      remove
    </button>
  );
}

export function RolePicker({ profileId, role }: { profileId: string; role: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await setMemberRole({ profileId, role: e.target.value as Role });
          router.refresh();
        })
      }
      className="min-h-0 border border-[var(--color-border-strong)] bg-[var(--ink-sunken)] px-2 py-1 text-[12px] text-[var(--cloud-white)]"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
