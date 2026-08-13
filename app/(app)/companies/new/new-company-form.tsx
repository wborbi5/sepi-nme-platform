"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Field, Input } from "@/components/ui";
import { createCompany } from "@/app/actions/companies";

export function NewCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCompany({ name, oneLiner });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/apply/${result.id}?pass=1`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Field label="Name" hint="A placeholder is fine. You can rename it at pass 2.">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>

      <Field
        label="One line"
        error={oneLiner.length === 50 ? "That is the cap." : undefined}
        hint={`${oneLiner.length}/50 — if it does not fit, it is not one line yet.`}
      >
        <Input
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value.slice(0, 50))}
          maxLength={50}
          placeholder="Sublets for students who move every semester"
        />
      </Field>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <Button
        onClick={submit}
        disabled={pending || !name.trim() || !oneLiner.trim()}
        className="w-full"
      >
        {pending ? "Creating…" : "Create and start the application"}
      </Button>
    </div>
  );
}
