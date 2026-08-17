"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/updates/new/actions";

const inputCls =
  "w-full rounded-md border border-coolgray bg-paper px-4 py-3 text-base text-midnight outline-none focus:border-oxford";

export default function PostForm({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await createPost(new FormData(e.currentTarget));
          router.push("/updates");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Post failed");
          setBusy(false);
        }
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <label className="mb-1 block text-sm font-bold text-steel" htmlFor="post-title">
          Title
        </label>
        <input id="post-title" name="title" required maxLength={120} className={inputCls} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-steel" htmlFor="post-company">
          As company (optional)
        </label>
        <select id="post-company" name="company_id" defaultValue="" className={inputCls}>
          <option value="">Personal update</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-steel">
          Company updates appear on the company page and notify its backers.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-steel" htmlFor="post-body">
          Update
        </label>
        <textarea id="post-body" name="body" required rows={10} className={inputCls} />
      </div>

      {error && <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="btn rounded-full border-0 bg-navy px-8 py-3 text-base font-bold text-white hover:bg-oxford disabled:opacity-60"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
