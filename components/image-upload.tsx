"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

const MAX_EDGE = 1200;
const QUALITY = 0.85;

type Status =
  | { phase: "idle" }
  | { phase: "resizing" }
  | { phase: "uploading"; percent: number }
  | { phase: "done" }
  | { phase: "error"; message: string };

/** Downscale and re-encode before a single byte leaves the device. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}

/**
 * Browser → Supabase Storage, directly, with the session token.
 *
 * File bytes never pass through a Vercel function. XHR rather than the
 * supabase-js helper because only XHR reports upload progress, and a real
 * percentage is a hard requirement on a phone with bad wifi.
 */
export function ImageUpload({
  bucket,
  path,
  currentUrl,
  label = "Photo",
  shape = "circle",
  onUploaded,
}: {
  bucket: string;
  path: string;
  currentUrl?: string | null;
  label?: string;
  shape?: "circle" | "square";
  onUploaded?: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus({ phase: "error", message: "That is not an image file." });
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus({ phase: "error", message: "That file is over 12MB. Try a smaller one." });
      return;
    }

    setPendingFile(file);
    // Optimistic: show it the instant it is picked, long before it lands.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setStatus({ phase: "resizing" });

    try {
      const blob = await toWebp(file);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Reload and try again.");

      const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint, true);
        xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
        xhr.setRequestHeader("Content-Type", "image/webp");
        // Avatars and logos live at a fixed filename and overwrite in place.
        xhr.setRequestHeader("x-upsert", "true");

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          setStatus({ phase: "uploading", percent: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
        xhr.send(blob);
      });

      setStatus({ phase: "done" });
      setPendingFile(null);
      onUploaded?.(path);
    } catch (err) {
      // Roll the preview back but keep the file, so retry costs one tap.
      setPreview(currentUrl ?? null);
      setStatus({
        phase: "error",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  };

  const busy = status.phase === "resizing" || status.phase === "uploading";

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-[var(--color-border-strong)] bg-[var(--color-surface-alt)]",
            shape === "circle" ? "h-[72px] w-[72px] rounded-full" : "h-[72px] w-[72px] rounded-[var(--radius)]",
          )}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] text-[var(--color-text-dim)]">None</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Working…" : preview ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
          </Button>

          {status.phase === "uploading" ? (
            <div className="mt-2">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full bg-[var(--cloud-white)] transition-[width] duration-150"
                  style={{ width: `${status.percent}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] tabular-nums text-[var(--color-text-dim)]">
                {status.percent}%
              </div>
            </div>
          ) : null}

          {status.phase === "resizing" ? (
            <p className="mt-2 text-[12px] text-[var(--color-text-dim)]">Resizing…</p>
          ) : null}

          {status.phase === "done" ? (
            <p className="mt-2 text-[12px] text-[var(--color-success)]">Saved.</p>
          ) : null}

          {status.phase === "error" ? (
            <div className="mt-2">
              <p role="alert" className="text-[12px] text-[var(--color-danger)]">
                {status.message}
              </p>
              {pendingFile ? (
                <button
                  type="button"
                  onClick={() => void upload(pendingFile)}
                  className="mt-1 min-h-0 text-[12px] text-[var(--cobalt-lift)]"
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
