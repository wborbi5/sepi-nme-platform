"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitSprintEntry } from "@/app/sprint/actions";
import { createClient } from "@/lib/supabase/client";
import {
  PROOF_MAX_BYTES,
  canResizeProofImage,
  proofContentType,
  proofExtension,
  sprintProofError,
} from "@/lib/sprint-proof";
import { sprintEntryError, sprintEntrySchema } from "@/lib/sprint-entry";

/*
 * Sprint submission: profit, a pre-service amount only when this sprint's
 * multiplier is not 1, and required proof (photo or PDF). Images that the
 * browser can draw are resized to WebP; PDFs and HEIC uploads go up as-is.
 * Bytes go straight to Storage.
 */

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";

const HEIC_MESSAGE = "Couldn't read that photo. Use a screenshot or JPG.";

function isHeic(file: { name: string; type: string }) {
  const type = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return type === "image/heic" || type === "image/heif" || ext === "heic" || ext === "heif";
}

async function resizeToWebp(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(HEIC_MESSAGE);
  }
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(HEIC_MESSAGE);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(HEIC_MESSAGE))),
      "image/webp",
      0.85
    )
  );
}

async function uploadProof(file: File, profileId: string): Promise<string> {
  const supabase = createClient();
  const stamp = Date.now();

  const uploadOriginal = async () => {
    const path = `${profileId}/${stamp}.${proofExtension(file)}`;
    const { error } = await supabase.storage.from("sprint").upload(path, file, {
      contentType: proofContentType(file),
    });
    if (error) throw new Error(error.message);
    return path;
  };

  if (!canResizeProofImage(file) && !isHeic(file)) return uploadOriginal();

  try {
    const blob = await resizeToWebp(file);
    if (blob.size > PROOF_MAX_BYTES) return uploadOriginal();
    const path = `${profileId}/${stamp}.webp`;
    const { error } = await supabase.storage.from("sprint").upload(path, blob, {
      contentType: "image/webp",
    });
    if (error) throw new Error(error.message);
    return path;
  } catch (err) {
    // HEIC often fails to decode in the browser. Say so instead of
    // storing a file the member can't preview.
    if (isHeic(file)) {
      throw new Error(err instanceof Error ? err.message : HEIC_MESSAGE);
    }
    return uploadOriginal();
  }
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
        Submitted. It counts on the board immediately and may be reviewed later.
      </p>
    );
  }

  const proofIsImage = Boolean(proofFile && proofFile.type.startsWith("image/") && proofPreview);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setError("");
        const fd = new FormData(form);
        const parsed = sprintEntrySchema.safeParse({
          event_id: eventId,
          amount_delivered: fd.get("amount_delivered"),
          amount_pre_service: fd.get("amount_pre_service"),
          description: fd.get("description"),
          proof_path: proofFile ? "selected" : "",
        });
        if (!parsed.success) {
          setError(sprintEntryError(parsed.error));
          return;
        }
        if (!proofFile) {
          setError("Add a proof photo or PDF before submitting.");
          return;
        }
        const fileError = sprintProofError(proofFile);
        if (fileError) {
          setError(fileError);
          return;
        }

        setBusy(true);
        let proofPath = "";
        try {
          proofPath = await uploadProof(proofFile, profileId);
          fd.set("event_id", eventId);
          fd.set("proof_path", proofPath);
          fd.set("amount_delivered", String(parsed.data.amount_delivered));
          fd.set("amount_pre_service", String(parsed.data.amount_pre_service));
          const result = await submitSprintEntry(fd);
          if (!result.ok) {
            if (proofPath) await createClient().storage.from("sprint").remove([proofPath]);
            setError(result.error);
            return;
          }
          setDone(true);
          router.refresh();
        } catch (err) {
          if (proofPath) {
            await createClient().storage.from("sprint").remove([proofPath]).catch(() => undefined);
          }
          const message = err instanceof Error ? err.message : "";
          setError(
            /screenshot or JPG/i.test(message)
              ? message
              : /mime type|not supported|exceeded the maximum|payload too large/i.test(message)
                ? "That proof file was rejected. Use a JPG, PNG, WebP, GIF, or PDF under 50MB."
                : message || "Submission failed."
          );
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
            inputMode="decimal"
            placeholder="12.50"
            autoComplete="off"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-steel">
            Real customers outside SEPi only. Cents are fine, like 12.50.
          </p>
        </div>
        {showPreService ? (
          <div>
            <label className="mb-1 block text-sm font-bold text-steel" htmlFor="sp-pre">
              $ pre-service (×{Number(multiplier)})
            </label>
            <input
              id="sp-pre"
              name="amount_pre_service"
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
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
          accept="image/*,application/pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp,.tif,.tiff,.avif,.pdf"
          aria-required="true"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const problem = sprintProofError(f);
            if (problem) {
              setError(problem);
              setProofFile(null);
              setProofPreview(null);
              return;
            }
            setError("");
            setProofFile(f);
            setProofPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
          }}
        />
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn min-h-11 rounded-full border border-coolgray bg-cream px-5 py-2.5 text-sm font-bold text-midnight"
          >
            {proofFile ? "Change proof" : "Add proof"}
          </button>
          <p className="mt-1 text-xs text-steel">Photo or PDF. Required.</p>
          {proofFile && !proofIsImage && (
            <p className="mt-1 text-xs font-semibold text-midnight">{proofFile.name}</p>
          )}
        </div>
        {proofIsImage && proofPreview && (
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
