"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ImageUpload } from "@/components/image-upload";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { submitSprintEntry } from "@/app/actions/sprint";
import { money } from "@/lib/format";

export function SprintForm({
  eventId,
  profileId,
  multiplier,
}: {
  eventId: string;
  profileId: string;
  multiplier: number;
}) {
  const router = useRouter();
  const [delivered, setDelivered] = useState("");
  const [preService, setPreService] = useState("");
  const [description, setDescription] = useState("");
  const [proofPath, setProofPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const d = Number(delivered) || 0;
  const p = Number(preService) || 0;
  const score = Math.round(d + p * multiplier);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitSprintEntry({
        eventId,
        amountDelivered: d,
        amountPreService: p,
        description,
        proofPath,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[#1e4b31] px-4 py-4">
        <p className="text-[15px] text-[var(--color-success)]">Submitted.</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          It hits the board once an admin approves it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Delivered" hint="Money for work already done.">
          <Input
            value={delivered}
            onChange={(e) => setDelivered(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className="figure text-[20px]"
          />
        </Field>
        <Field label="Pre-service" hint={`Paid up front. Counts ${multiplier}x.`}>
          <Input
            value={preService}
            onChange={(e) => setPreService(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className="figure text-[20px]"
          />
        </Field>
      </div>

      {score > 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] px-4 py-3">
          <div className="eyebrow">Scores as</div>
          <div className="figure mt-0.5 text-[24px] text-[var(--cloud-white)]">
            {money(score)}
          </div>
        </div>
      ) : null}

      <Field label="What was it" optional>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
          placeholder="Detailed two cars and pre-sold three more for spring break."
        />
      </Field>

      <div>
        <div className="mb-2 text-[13px] font-medium text-[var(--cloud-white)]">Proof</div>
        <ImageUpload
          bucket="sprint"
          path={`${profileId}/${Date.now()}.webp`}
          label="Proof"
          shape="square"
          onUploaded={setProofPath}
        />
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={pending || score === 0} className="w-full">
        {pending ? "Submitting…" : "Submit for approval"}
      </Button>
    </div>
  );
}
