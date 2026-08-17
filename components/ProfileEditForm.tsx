"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateOwnProfile } from "@/app/settings/profile/actions";
import type { ProfileRow } from "@/lib/data";

/*
 * Self-service profile editor. Files go browser → Supabase Storage
 * directly with the session token (never through a server function).
 * Avatars are resized client-side to ≤1200px WebP q0.85 per the spec.
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

export default function ProfileEditForm({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path ?? "");
  const [resumePath, setResumePath] = useState(profile.resume_path ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "avatar" | "resume" | "save">("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image.");
      return;
    }
    // Local preview immediately, before upload finishes
    setAvatarPreview(URL.createObjectURL(file));
    setBusy("avatar");
    try {
      const blob = await resizeToWebp(file);
      if (blob.size > 2 * 1024 * 1024)
        throw new Error("Avatar is over 2MB after compression — try a smaller image.");
      const path = `${profile.id}/avatar.webp`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (upErr) throw new Error(upErr.message);
      setAvatarPath(path);
    } catch (e) {
      setAvatarPreview(null); // rollback optimistic preview
      setError(e instanceof Error ? e.message : "Avatar upload failed — try again.");
    } finally {
      setBusy("");
    }
  }

  async function uploadResume(file: File) {
    setError("");
    if (file.type !== "application/pdf") {
      setError("Resume must be a PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume is over the 5MB limit.");
      return;
    }
    setBusy("resume");
    try {
      const path = `${profile.id}/resume.pdf`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw new Error(upErr.message);
      setResumePath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume upload failed — try again.");
    } finally {
      setBusy("");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy("save");
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("avatar_path", avatarPath);
      fd.set("resume_path", resumePath);
      await updateOwnProfile(fd);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed — try again.");
    } finally {
      setBusy("");
    }
  }

  const avatarUrl =
    avatarPreview ??
    (avatarPath && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${avatarPath}?v=${Date.now()}`
      : null);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* ---------------------------------------------------------- avatar */}
      <div className="flex items-center gap-5">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-powder text-3xl font-bold text-navy">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile.full_name ?? "?").charAt(0)
          )}
        </span>
        <div>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => avatarInput.current?.click()}
            disabled={busy === "avatar"}
            className="btn rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream disabled:opacity-60"
          >
            {busy === "avatar" ? "Uploading…" : "Change photo"}
          </button>
          <p className="mt-1 text-xs text-steel">
            Resized to WebP automatically · 2MB max
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------- fields */}
      <div>
        <label className={labelCls} htmlFor="full_name">Name</label>
        <input id="full_name" name="full_name" required defaultValue={profile.full_name ?? ""} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="major">Major</label>
          <input id="major" name="major" defaultValue={profile.major ?? ""} placeholder="Finance + CS" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="grad_year">Graduation year</label>
          <input id="grad_year" name="grad_year" inputMode="numeric" defaultValue={profile.grad_year ?? ""} placeholder="2028" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="pledge_class">Pledged SEPi</label>
        <input id="pledge_class" name="pledge_class" defaultValue={profile.pledge_class ?? ""} placeholder="Fall 2025" className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="bio">Bio</label>
        <textarea id="bio" name="bio" rows={5} defaultValue={profile.bio ?? ""} placeholder="Who you are, what you're building, what you care about." className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="skills">Skills (comma-separated)</label>
        <input id="skills" name="skills" defaultValue={profile.skills.join(", ")} placeholder="Python, cold outreach, Figma" className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="interests">Interests (comma-separated)</label>
        <input id="interests" name="interests" defaultValue={profile.interests.join(", ")} placeholder="Fintech, climbing, poker" className={inputCls} />
      </div>

      <div>
        <label className={labelCls} htmlFor="linkedin_url">LinkedIn URL</label>
        <input id="linkedin_url" name="linkedin_url" defaultValue={profile.linkedin_url ?? ""} placeholder="https://linkedin.com/in/you" className={inputCls} />
      </div>

      {/* ---------------------------------------------------------- resume */}
      <div>
        <span className={labelCls}>Resume</span>
        <div className="flex items-center gap-3">
          <input
            ref={resumeInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => resumeInput.current?.click()}
            disabled={busy === "resume"}
            className="btn rounded-full border border-coolgray bg-paper px-5 py-2.5 text-sm font-bold text-midnight hover:bg-cream disabled:opacity-60"
          >
            {busy === "resume" ? "Uploading…" : resumePath ? "Replace resume" : "Upload resume"}
          </button>
          {resumePath && <span className="text-sm text-steel">PDF on file ✓</span>}
        </div>
      </div>

      {/* ------------------------------------------------------------ save */}
      {error && <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>}
      {saved && <p className="text-sm font-semibold text-[#15803d]">Profile saved.</p>}
      <div>
        <button
          type="submit"
          disabled={busy !== ""}
          className="btn rounded-full bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
        >
          {busy === "save" ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
