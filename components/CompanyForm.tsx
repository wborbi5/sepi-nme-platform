"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCompany, setCompanyLogo } from "@/app/companies/new/actions";

/*
 * Submit-a-company form. Create the row first (that mints the id the
 * logo path needs), then push the logo browser → Storage, then attach
 * the path. If the logo fails the company still exists — logos are
 * editable later, companies are not lost to a flaky connection.
 */

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";
const labelCls = "mb-1 block text-sm font-bold text-steel";

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

export default function CompanyForm({
  members,
  selfId,
}: {
  members: { id: string; full_name: string | null }[];
  selfId: string;
}) {
  const router = useRouter();
  const [oneLiner, setOneLiner] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cofounders, setCofounders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function toggleCofounder(id: string) {
    setCofounders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("cofounder_ids", cofounders.join(","));
      const { id, slug } = await createCompany(fd);

      // Logo after create — path needs the company id.
      if (logoFile) {
        try {
          const blob = await resizeToWebp(logoFile);
          const path = `${id}/logo.webp`;
          const supabase = createClient();
          const { error: upErr } = await supabase.storage
            .from("logos")
            .upload(path, blob, { upsert: true, contentType: "image/webp" });
          if (!upErr) {
            const logoFd = new FormData();
            logoFd.set("company_id", id);
            logoFd.set("logo_path", path);
            await setCompanyLogo(logoFd);
          }
        } catch {
          // Company exists; logo can be added later. Don't block the redirect.
        }
      }

      router.push(`/companies/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create company");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ logo */}
      <div className="flex items-center gap-5">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone bg-paper">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-mist">?</span>
          )}
        </span>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setLogoFile(f);
                setLogoPreview(URL.createObjectURL(f));
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="btn rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream"
          >
            {logoFile ? "Change logo" : "Add logo"}
          </button>
          <p className="mt-1 text-xs text-steel">
            Shows on the Member Companies wall on the homepage.
          </p>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="name">Company name</label>
        <input id="name" name="name" required maxLength={80} className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="one_liner">
          One-liner
          <span className={`float-right font-normal ${oneLiner.length > 50 ? "text-[#b91c1c]" : "text-mist"}`}>
            {oneLiner.length}/50
          </span>
        </label>
        <input
          id="one_liner"
          name="one_liner"
          required
          maxLength={50}
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          placeholder="Restaurant delivery."
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="industry">Industry</label>
          <input id="industry" name="industry" placeholder="Consumer" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="founded_year">Year founded</label>
          <input id="founded_year" name="founded_year" inputMode="numeric" placeholder="2026" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="website_url">Website</label>
          <input id="website_url" name="website_url" placeholder="https://…" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="demo_url">Demo link</label>
          <input id="demo_url" name="demo_url" placeholder="https://…" className={inputCls} />
        </div>
      </div>

      {/* ------------------------------------------------------ co-founders */}
      <div>
        <span className={labelCls}>Co-founders (tap to add)</span>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-md border border-coolgray bg-paper p-3">
          {members
            .filter((m) => m.id !== selfId)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleCofounder(m.id)}
                className={`btn cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${
                  cofounders.includes(m.id)
                    ? "border-navy bg-navy text-white"
                    : "border-coolgray bg-cream text-midnight"
                }`}
              >
                {m.full_name ?? "Member"}
              </button>
            ))}
          {members.length <= 1 && (
            <span className="text-sm text-steel">No other members yet.</span>
          )}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="btn rounded-full bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create company"}
        </button>
      </div>
    </form>
  );
}
