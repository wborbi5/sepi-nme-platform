import Link from "next/link";

import { requireProfile } from "@/lib/auth";

import { NewCompanyForm } from "./new-company-form";

export const metadata = { title: "Start a company · SEPi NME" };

export default async function NewCompanyPage() {
  await requireProfile();

  return (
    <div className="mx-auto max-w-[480px]">
      <Link href="/directory" className="text-[13px] text-[var(--color-text-dim)]">
        ← Companies
      </Link>

      <header className="mt-3 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Start a company</h1>
        <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
          Two fields now. The rest comes through the Accelerator Application, in three passes
          across the program.
        </p>
      </header>

      <div className="mt-7">
        <NewCompanyForm />
      </div>
    </div>
  );
}
