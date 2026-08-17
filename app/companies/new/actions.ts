"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/*
 * Company creation. Session client throughout — RLS's companies_insert
 * policy is the gate. The slug is generated ONCE here and never changes;
 * it lives in URLs and DB-generated notification links.
 */

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  one_liner: z.string().trim().min(3).max(50),
  industry: z.string().trim().max(60).optional(),
  founded_year: z.union([z.coerce.number().int().min(2000).max(2100), z.literal("")]).optional(),
  website_url: z.union([z.string().trim().url(), z.literal("")]).optional(),
  demo_url: z.union([z.string().trim().url(), z.literal("")]).optional(),
  cofounder_ids: z.string().optional(), // comma-separated profile uuids
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export async function createCompany(
  formData: FormData
): Promise<{ id: string; slug: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const parsed = schema.parse(Object.fromEntries(formData.entries()));

  // Slug: generated once at creation. Suffix on collision, never mutate.
  const base = slugify(parsed.name) || "company";
  let slug = base;
  for (let n = 2; n < 20; n++) {
    const { data: taken } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${n}`;
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      slug,
      name: parsed.name,
      one_liner: parsed.one_liner,
      industry: parsed.industry || null,
      founded_year:
        parsed.founded_year === "" || parsed.founded_year == null
          ? null
          : parsed.founded_year,
      website_url: parsed.website_url || null,
      demo_url: parsed.demo_url || null,
      created_by: user.id,
    })
    .select("id, slug")
    .single();
  if (error || !company) throw new Error(error?.message ?? "Could not create company");

  // Founding team: creator + selected co-founders.
  const cofounders = (parsed.cofounder_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => z.string().uuid().safeParse(s).success && s !== user.id);

  const members = [
    { company_id: company.id, profile_id: user.id, role: "Founder" },
    ...cofounders.map((id) => ({
      company_id: company.id,
      profile_id: id,
      role: "Co-founder",
    })),
  ];
  const { error: memberErr } = await supabase.from("company_members").insert(members);
  if (memberErr) throw new Error(memberErr.message);

  revalidatePath("/companies");
  revalidatePath("/");
  return { id: company.id, slug: company.slug };
}

/* Called after the browser uploads the logo to logos/{id}/logo.webp. */
export async function setCompanyLogo(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const id = z.string().uuid().parse(formData.get("company_id"));
  const path = z.string().min(3).parse(formData.get("logo_path"));
  if (!path.startsWith(`${id}/`)) throw new Error("Logo path must live under the company id");

  // RLS: companies_member_update — only the founding team or admin passes.
  const { error } = await supabase.from("companies").update({ logo_path: path }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/companies");
  revalidatePath("/");
}
