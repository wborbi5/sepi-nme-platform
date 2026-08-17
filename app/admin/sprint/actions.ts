"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient, requireAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function createSprintEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = z.string().trim().min(2).max(80).parse(formData.get("name"));
  const multiplier = z.coerce.number().min(1).max(5).parse(formData.get("multiplier") || "1.5");
  const service = createServiceClient();
  const { error } = await service.from("sprint_events").insert({ name, multiplier });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sprint");
}

export async function setSprintStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["draft", "open", "closed"]).parse(formData.get("status"));
  const patch: Record<string, unknown> = { status };
  if (status === "open") patch.started_at = new Date().toISOString();
  if (status === "closed") patch.ended_at = new Date().toISOString();
  const service = createServiceClient();
  const { error } = await service.from("sprint_events").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sprint");
  revalidatePath("/sprint");
}

const reviewSchema = z.object({
  entry_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reject_reason: z.string().trim().max(300).optional(),
  team: z.union([z.enum(["wyatt", "madison"]), z.literal("")]).optional(),
});

export async function reviewSprintEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = reviewSchema.parse(Object.fromEntries(formData.entries()));

  const service = createServiceClient();
  const { data: entry, error } = await service
    .from("sprint_entries")
    .update({
      status: parsed.decision,
      reject_reason: parsed.decision === "rejected" ? parsed.reject_reason || null : null,
      team: parsed.team || null,
    })
    .eq("id", parsed.entry_id)
    .select("profile_id, amount_delivered, amount_pre_service")
    .single();
  if (error || !entry) throw new Error(error?.message ?? "Entry not found");

  // In-app notification either way; email only on rejection (spec).
  try {
    const { data: profile } = await service
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", entry.profile_id)
      .single();

    await service.from("notifications").insert({
      recipient_id: entry.profile_id,
      type: `sprint_${parsed.decision}`,
      body:
        parsed.decision === "approved"
          ? "Your sprint entry was approved — it now counts on the board."
          : `Your sprint entry was rejected${parsed.reject_reason ? `: ${parsed.reject_reason}` : ""}.`,
      link: "/sprint",
    });

    if (parsed.decision === "rejected" && profile?.email) {
      await sendEmail({
        recipientId: profile.id,
        toEmail: profile.email,
        type: "sprint_rejected",
        subject: "Your Money Sprint entry was rejected",
        bodyHtml: `<p>Your sprint entry ($${entry.amount_delivered} delivered, $${entry.amount_pre_service} pre-service) was rejected.</p>
${parsed.reject_reason ? `<p>Reason: ${parsed.reject_reason}</p>` : ""}
<p>Fix it and resubmit — the sprint is still on.</p>`,
        bodyText: `Your sprint entry was rejected.${parsed.reject_reason ? ` Reason: ${parsed.reject_reason}` : ""}`,
        dedupeKey: `sprint-reject:${parsed.entry_id}`,
      });
    }
  } catch (err) {
    console.error("sprint review notification failed:", err);
  }

  revalidatePath("/admin/sprint");
  revalidatePath("/sprint");
}
