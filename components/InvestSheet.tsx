"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeInvestment } from "@/app/invest/actions";

/*
 * The investment flow — a bottom sheet, not a centered modal (spec hard
 * requirement; this gets used on phones in a loud room). Client-side
 * checks mirror the Postgres rules for instant feedback only; the
 * database is the authority and its error message wins.
 */

const COMMITMENT_TYPES = ["capital", "mentorship", "intros", "hands-on help"];

export default function InvestSheet({
  companyId,
  companyName,
  min,
  max,
  balance,
}: {
  companyId: string;
  companyName: string;
  min: number;
  max: number;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const amountNum = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const clientProblem =
    amountNum === 0
      ? null
      : amountNum < min
        ? `Minimum is $${min.toLocaleString()}`
        : amountNum > max
          ? `Maximum is $${max.toLocaleString()}`
          : amountNum > balance
            ? `Over your remaining balance of $${balance.toLocaleString()}`
            : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("company_id", companyId);
      fd.set("amount", String(amountNum));
      fd.set("note", note);
      for (const t of types) fd.append("types", t);
      await placeInvestment(fd);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Investment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn w-full cursor-pointer rounded-full border-0 bg-navy px-8 py-3.5 text-base font-bold text-white hover:bg-oxford sm:w-auto"
      >
        Invest in {companyName}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* scrim */}
          <button
            aria-label="Close"
            onClick={() => !busy && setOpen(false)}
            className="absolute inset-0 border-0 bg-black/40"
          />
          {/* sheet */}
          <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-6 pb-10 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone" aria-hidden />

            {done ? (
              <div className="py-8 text-center">
                <p className="text-2xl font-extrabold text-midnight">
                  Investment placed.
                </p>
                <p className="mt-3 leading-7 text-slate-blue">
                  ${amountNum.toLocaleString()} is committed to {companyName}.
                  The founders have 72 hours to respond — silence is
                  acceptance. Your funds are locked until they decline.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="btn mt-6 rounded-full bg-navy px-8 py-3 font-bold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <h2 className="text-xl font-extrabold text-midnight">
                  Invest in {companyName}
                </h2>
                <p className="text-sm text-steel">
                  ${min.toLocaleString()}–${max.toLocaleString()} · balance $
                  {balance.toLocaleString()} · one investment per company ·
                  no take-backs
                </p>

                <div>
                  <label className="mb-1 block text-sm font-bold text-steel" htmlFor="inv-amount">
                    Amount ($)
                  </label>
                  <input
                    id="inv-amount"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(min)}
                    className="w-full rounded-md border border-coolgray bg-cream px-4 py-3 text-2xl font-bold text-midnight outline-none focus:border-oxford"
                  />
                  {clientProblem && (
                    <p className="mt-1 text-sm font-semibold text-[#b45309]">{clientProblem}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-steel" htmlFor="inv-note">
                    Why are you investing? <span className="text-[#b91c1c]">*</span>
                  </label>
                  <textarea
                    id="inv-note"
                    required
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="This note is the point — it shows publicly next to your name."
                    className="w-full rounded-md border border-coolgray bg-cream px-4 py-3 text-base text-midnight outline-none focus:border-oxford"
                  />
                </div>

                <div>
                  <span className="mb-1 block text-sm font-bold text-steel">
                    Beyond the money, you're offering
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {COMMITMENT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setTypes((prev) =>
                            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                          )
                        }
                        className={`btn cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${
                          types.includes(t)
                            ? "border-navy bg-navy text-white"
                            : "border-coolgray bg-cream text-midnight"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm font-semibold text-[#b91c1c]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={busy || !amountNum || !note.trim() || Boolean(clientProblem)}
                  className="btn rounded-full border-0 bg-navy px-8 py-3.5 text-base font-bold text-white hover:bg-oxford disabled:opacity-50"
                >
                  {busy
                    ? "Placing…"
                    : `Commit $${amountNum ? amountNum.toLocaleString() : "—"}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
