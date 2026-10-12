"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEligibleCofounder } from "@/lib/cofounders";
import { optionalHttpUrl } from "@/lib/http-url";
import { createClient } from "@/lib/supabase/server";

/*
 * Company creation. Session client throughout — RLS's companies_insert
 * policy is the gate. The slug is generated ONCE here and never changes;
 * it lives in URLs and DB-generated notification links.
 *
 * Expected failures return { ok: false } instead of throwing. A thrown
 * error in a Server Action becomes the generic production digest
 * "An error occurred in the Server Components render".
 */

const YEAR_MESSAGE = "Year founded must be a year between 2000 and 2100.";
const WEBSITE_MESSAGE = "Website must be a valid URL like czarcrm.com";
const DEMO_MESSAGE = "Demo link must be a valid URL like czarcrm.com";

const schema = z.object({
  name: z
    .string({ required_error: "Company name must be 2–80 characters." })
    .trim()
    .min(2, "Company name must be 2–80 characters.")
    .max(80, "Company name must be 2–80 characters."),
  one_liner: z
    .string({ required_error: "One-liner must be 3–50 characters." })
    .trim()
    .min(3, "One-liner must be 3–50 characters.")
    .max(50, "One-liner must be 3–50 characters."),
  industry: z.string().trim().max(60, "Industry must be 60 characters or fewer.").optional(),
  founded_year: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number({ invalid_type_error: YEAR_MESSAGE })
      .int(YEAR_MESSAGE)
      .min(2000, YEAR_MESSAGE)
      .max(2100, YEAR_MESSAGE)
      .optional()
  ),
  website_url: z.string().optional(),
  demo_url: z.string().optional(),
  cofounder_ids: z.string().optional(),
});

function validationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

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
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  try {
    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

    // Trim and add https:// before the URL check. Empty stays null.
    const website = optionalHttpUrl(parsed.data.website_url);
    if (!website.ok) return { ok: false, error: WEBSITE_MESSAGE };
    const demo = optionalHttpUrl(parsed.data.demo_url);
    if (!demo.ok) return { ok: false, error: DEMO_MESSAGE };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be signed in to create a company." };

    // Slug: generated once at creation. Suffix on collision, never mutate.
    const base = slugify(parsed.data.name) || "company";
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
        name: parsed.data.name,
        one_liner: parsed.data.one_liner,
        industry: parsed.data.industry || null,
        founded_year: parsed.data.founded_year ?? null,
        website_url: website.value,
        demo_url: demo.value,
        created_by: user.id,
      })
      .select("id, slug")
      .single();
    if (error || !company) {
      return { ok: false, error: "Could not create the company. Try again." };
    }

    // Founding team: creator + selected co-founders. Drop anyone who is
    // inactive, unnamed, the system account, or not a real profile. Role
    // is not a reason to drop someone.
    const requested = [
      ...new Set(
        (parsed.data.cofounder_ids ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => z.string().uuid().safeParse(s).success && s !== user.id)
      ),
    ];

    let cofounders: string[] = [];
    if (requested.length > 0) {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active")
        .in("id", requested);
      const eligible = new Set(
        ((rows ?? []) as {
          id: string;
          full_name: string | null;
          email: string | null;
          is_active: boolean;
        }[])
          .filter((row) => isEligibleCofounder(row))
          .map((row) => row.id)
      );
      cofounders = requested.filter((id) => eligible.has(id));
    }

    const members = [
      { company_id: company.id, profile_id: user.id, role: "Founder" },
      ...cofounders.map((id) => ({
        company_id: company.id,
        profile_id: id,
        role: "Co-founder",
      })),
    ];
    const { error: memberErr } = await supabase.from("company_members").insert(members);
    if (memberErr) {
      // The company row stays. Deleting it would hide a company the member
      // already created; they can be added to the team afterwards.
      revalidatePath("/companies");
      revalidatePath("/");
      return {
        ok: false,
        error: "The company was created, but the team couldn't be added.",
      };
    }

    revalidatePath("/companies");
    revalidatePath("/");
    return { ok: true, id: company.id, slug: company.slug };
  } catch {
    return { ok: false, error: "Something went wrong creating the company. Try again." };
  }
}

/* Called after the browser uploads the logo to logos/{id}/logo.webp. */
export async function setCompanyLogo(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You need to be signed in to update the logo." };

    const id = z.string().uuid().safeParse(formData.get("company_id"));
    if (!id.success) return { ok: false, error: "Company id is invalid." };

    const path = z.string().min(3).safeParse(formData.get("logo_path"));
    if (!path.success) return { ok: false, error: "Logo path is invalid." };
    if (!path.data.startsWith(`${id.data}/`)) {
      return { ok: false, error: "Logo path must live under the company id." };
    }

    // RLS: companies_member_update — only the founding team or admin passes.
    const { error } = await supabase
      .from("companies")
      .update({ logo_path: path.data })
      .eq("id", id.data);
    if (error) return { ok: false, error: "Could not save the logo. You can add it later." };

    revalidatePath("/companies");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save the logo. You can add it later." };
  }
}
