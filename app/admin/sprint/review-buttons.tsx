"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui";
import { reviewSprintEntry } from "@/app/actions/admin";

/** Approve puts it on the board. Reject needs a reason — the member sees it. */
export function SprintReviewButtons({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const send = (status: "approved" | "rejected") =>
    startTransition(async () => {
      await reviewSprintEntry({ entryId, status, reason });
      setRejecting(false);
      setReason("");
      router.refresh();
    });

  if (rejecting) {
    return (
      <div className="space-y-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why?"
          maxLength={300}
          className="text-[13px]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send("rejected")}
            disabled={pending || !reason.trim()}
            className="min-h-0 border border-[#5b2126] px-2 py-1 text-[12px] text-[var(--color-danger)] disabled:opacity-40"
          >
            reject
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="min-h-0 text-[12px] text-[var(--color-text-dim)]"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => send("approved")}
        disabled={pending}
        className="min-h-0 border border-[#1e4b31] px-2 py-1 text-[12px] text-[var(--color-success)]"
      >
        approve
      </button>
      <button
        type="button"
        onClick={() => setRejecting(true)}
        className="min-h-0 text-[12px] text-[var(--color-danger)]"
      >
        reject
      </button>
    </div>
  );
}
