"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMentor } from "@/app/resources/mentor-directory/actions";
import { parseMentorUrl } from "@/lib/mentors";

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";

export default function AddMentorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const form = e.currentTarget;
        const raw = String(new FormData(form).get("linkedin_url") ?? "");
        const parsed = parseMentorUrl(raw);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        setBusy(true);
        try {
          const result = await addMentor(new FormData(form));
          if (result.error) {
            setError(result.error);
            setBusy(false);
            return;
          }
          form.reset();
          setBusy(false);
          router.refresh();
        } catch {
          setError("Could not add that mentor.");
          setBusy(false);
        }
      }}
      className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="mentor-linkedin">
          LinkedIn profile URL
        </label>
        <input
          id="mentor-linkedin"
          name="linkedin_url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="https://www.linkedin.com/in/…"
          className={inputCls}
        />
        {error ? (
          <p className="mt-2 text-sm font-semibold text-[#b91c1c]">{error}</p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={busy}
        className="btn w-full shrink-0 rounded-full border-0 bg-navy px-6 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Adding…" : "Add mentor"}
      </button>
    </form>
  );
}
