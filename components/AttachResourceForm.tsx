"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachResource } from "@/app/invest/actions";

/* Attach a link / mentor intro / suggestion to one of your investments.
 * Each attach notifies the founding team. */
export default function AttachResourceForm({ investmentId }: { investmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const input =
    "w-full rounded-md border border-coolgray bg-paper px-3 py-2.5 text-sm text-midnight outline-none focus:border-oxford";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn cursor-pointer rounded-full border border-coolgray bg-paper px-4 py-2 text-xs font-bold text-midnight hover:bg-cream"
      >
        + Attach a resource
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          fd.set("investment_id", investmentId);
          await attachResource(fd);
          setOpen(false);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-2 flex flex-col gap-2 rounded-lg border border-stone bg-cream p-3"
    >
      <div className="flex gap-2">
        <select name="type" className={input} defaultValue="link">
          <option value="link">Link</option>
          <option value="mentor">Mentor intro</option>
          <option value="resource">Resource</option>
          <option value="suggestion">Suggestion</option>
        </select>
        <input name="title" required placeholder="Title" className={input} />
      </div>
      <input name="url" placeholder="https://… (optional)" className={input} />
      <textarea name="description" rows={2} placeholder="Details (optional)" className={input} />
      {error && <p className="text-xs font-semibold text-[#b91c1c]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="btn cursor-pointer rounded-full border-0 bg-navy px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send to founders"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn cursor-pointer rounded-full border border-coolgray bg-paper px-5 py-2 text-xs font-bold text-midnight"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
