"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui";
import { respondToInvestment } from "@/app/actions/investments";

/** Founder-side accept/decline. The only two things you can do with a pending. */
export function RespondButtons({ investmentId }: { investmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (status: "accepted" | "declined") => {
    setError(null);
    startTransition(async () => {
      const result = await respondToInvestment({ investmentId, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex gap-2">
        <Button onClick={() => respond("accepted")} disabled={pending} className="flex-1">
          Accept
        </Button>
        <Button variant="danger" onClick={() => respond("declined")} disabled={pending}>
          Decline
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
