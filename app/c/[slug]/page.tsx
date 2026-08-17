import { redirect } from "next/navigation";

/*
 * Database-generated notification links use /c/{slug} (see notify()
 * calls in 0002_functions.sql). The portal's canonical route is
 * /companies/{slug} — bridge them here.
 */
export default async function LegacyCompanyRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/companies/${slug}`);
}
