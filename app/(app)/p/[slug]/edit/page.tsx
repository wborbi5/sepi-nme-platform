import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { getProfileBySlug } from "@/lib/data";

import { EditProfileForm } from "./edit-form";

export const metadata = { title: "Edit profile · SEPi NME" };

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await requireProfile();
  const subject = await getProfileBySlug(slug);

  if (!subject) notFound();
  // You edit yourself. Admins edit anyone from the admin console, not here.
  if (subject.id !== viewer.id) redirect(`/p/${slug}`);

  return (
    <div>
      <header className="mb-6 border-b border-[var(--color-border)] pb-5">
        <Link href={`/p/${slug}`} className="text-[13px] text-[var(--color-text-dim)]">
          ← Your profile
        </Link>
        <h1 className="mt-2 text-[28px] leading-none text-[var(--cloud-white)]">Edit</h1>
      </header>

      <EditProfileForm profile={subject} />
    </div>
  );
}
