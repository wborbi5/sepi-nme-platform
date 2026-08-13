import { Lockup } from "@/components/mark";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deactivated?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col justify-between px-5 py-8">
      <Lockup />

      <div className="mx-auto w-full max-w-[360px] py-10">
        {params.deactivated ? (
          <p className="mb-5 rounded-[var(--radius)] border border-[#5b2126] px-3 py-2 text-[13px] text-[var(--color-danger)]">
            This account is deactivated. Talk to an admin.
          </p>
        ) : null}
        {params.error ? (
          <p className="mb-5 rounded-[var(--radius)] border border-[#5b2126] px-3 py-2 text-[13px] text-[var(--color-danger)]">
            {params.error}
          </p>
        ) : null}

        <LoginForm next={params.next} />
      </div>

      {/* Three facts, no marketing. The dark ground does the work. */}
      <div className="grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-5">
        {[
          ["7", "weeks"],
          ["$200k", "to deploy"],
          ["Dec 4", "Athena 42"],
        ].map(([value, label]) => (
          <div key={label}>
            <div className="figure text-[20px] text-[var(--cloud-white)]">{value}</div>
            <div className="eyebrow mt-1">{label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
