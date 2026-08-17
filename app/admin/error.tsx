"use client";

/* Admin error boundary — surfaces thrown action/query messages plainly. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border border-[#b91c1c] bg-[#fef2f2] p-4 text-[13px]">
      <b className="text-[#b91c1c]">Action failed:</b>{" "}
      {error.message || "Unknown error"}
      <div className="mt-2">
        <button
          onClick={reset}
          className="cursor-pointer border border-[#888] bg-[#eee] px-2 py-0.5 text-[12px] hover:bg-[#ddd]"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
