"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitSprintEntry } from "@/app/sprint/actions";

/*
 * Sprint submission: profit, a pre-service amount only when this sprint's
 * multiplier is not 1, and a required proof photo. Camera opens directly
 * on mobile (capture="environment"). The photo resizes to WebP client-side
 * and goes straight to Storage.
 */

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";

async function resizeToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process image"))),
      "image/webp",
      0.85
    )
  );
}

export default function SprintSubmitForm({
  eventId,
  profileId,
  multiplier,
}: {
  eventId: string;
  profileId: string;
  multiplier: number;
}) {
  const showPreService = Number(multiplier) !== 1;
  const router = useRouter();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (done) {
    return (
      <p className="rounded-lg border border-stone bg-paper p-4 font-semibold text-midnight">
        Submitted — pending admin approval. It counts toward the board once
        approved.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setError("");
        if (!proofFile) {
          setError("Add a proof photo before submitting.");
          return;
        }
        setBusy(true);
        try {
          const blob = await resizeToWebp(proofFile);
          if (blob.size > 10 * 1024 * 1024)
            throw new Error("Proof photo is over 10MB after compression");
          const proofPath = `${profileId}/${Date.now()}.webp`;
          const supabase = createClient();
          const { error: upErr } = await supabase.storage
            .from("sprint")
            .upload(proofPath, blob, { contentType: "image/webp" });
          if (upErr) throw new Error(upErr.message);
          const fd = new FormData(form);
          fd.set("event_id", eventId);
          fd.set("proof_path", proofPath);
          const result = await submitSprintEntry(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDone(true);
          router.refresh();
        } catch (err) {
          // selected file survives a failure — just retry
          setError(err instanceof Error ? err.message : "Submission failed");
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-4 rounded-xl border border-stone bg-paper p-5"
    >
      <h2 className="text-lg font-extrabold text-midnight">Submit money</h2>

      <div className={`grid grid-cols-1 gap-4 ${showPreService ? "sm:grid-cols-2" : ""}`}>
        <div>
          <label className="mb-1 block text-sm font-bold text-steel" htmlFor="sp-delivered">
            Profit (revenue minus costs), $
          </label>
          <input
            id="sp-delivered"
            name="amount_delivered"
            inputMode="numeric"
            defaultValue="0"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-steel">Real customers outside SEPi only.</p>
        </div>
        {showPreService ? (
          <div>
            <label className="mb-1 block text-sm font-bold text-steel" htmlFor="sp-pre">
              $ pre-service (×{Number(multiplier)})
            </label>
            <input
              id="sp-pre"
              name="amount_pre_service"
              inputMode="numeric"
              defaultValue="0"
              className={inputCls}
            />
          </div>
        ) : (
          <input type="hidden" name="amount_pre_service" value="0" />
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-steel" htmlFor="sp-desc">
          What was it?
        </label>
        <input id="sp-desc" name="description" maxLength={500} className={inputCls} />
      </div>

      <div className="flex items-center gap-4">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          aria-required="true"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setProofFile(f);
              setProofPreview(URL.createObjectURL(f));
            }
          }}
        />
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn min-h-11 rounded-full border border-coolgray bg-cream px-5 py-2.5 text-sm font-bold text-midnight"
          >
            {proofFile ? "Retake proof photo" : "📷 Proof photo"}
          </button>
          <p className="mt-1 text-xs text-steel">Required.</p>
        </div>
        {proofPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proofPreview} alt="Proof preview" className="h-14 w-14 rounded object-cover" />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn rounded-full border-0 bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit entry"}
      </button>
    </form>
  );
}
