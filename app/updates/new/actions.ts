"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, serviceRoleConfigured } from "@/lib/supabase/admin";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(10000),
  company_id: z.union([z.string().uuid(), z.literal("")]).optional(),
});

export async function createPost(formData: FormData): Promise<void> {
  const parsed = schema.parse(Object.fromEntries(formData.entries()));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Company posts come from that company's team only.
  if (parsed.company_id) {
    const { data: membership } = await supabase
      .from("company_members")
      .select("profile_id")
      .eq("company_id", parsed.company_id)
      .eq("profile_id", user.id)
      .maybeSingle();
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!membership && me?.role !== "admin")
      throw new Error("You can only post updates for your own company");
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    company_id: parsed.company_id || null,
    title: parsed.title,
    body: parsed.body,
  });
  if (error) throw new Error(error.message);

  // Notify accepted backers of this company — in-app only, never email
  // (spec: never email new posts).
  if (parsed.company_id && serviceRoleConfigured()) {
    try {
      const service = createServiceClient();
      const [{ data: company }, { data: backers }] = await Promise.all([
        service.from("companies").select("name, slug").eq("id", parsed.company_id).single(),
        service
          .from("investments")
          .select("investor_id")
          .eq("company_id", parsed.company_id)
          .eq("status", "accepted"),
      ]);
      const rows = (backers ?? []).map((b) => ({
        recipient_id: b.investor_id,
        type: "company_update",
        body: `${company?.name} posted an update: ${parsed.title}`,
        link: `/companies/${company?.slug}`,
      }));
      if (rows.length > 0) await service.from("notifications").insert(rows);
    } catch (err) {
      console.error("backer notification failed:", err);
    }
  }

  revalidatePath("/updates");
}
