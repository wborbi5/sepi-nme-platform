"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient, requireAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function createSprintEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = z.string().trim().min(2).max(80).parse(formData.get("name"));
  const audience = z
    .enum(["current_member", "new_member"])
    .parse(formData.get("audience"));
  const multiplier = z.coerce.number().min(1).max(5).parse(formData.get("multiplier") || "1.5");
  const team_a_name =
    z.string().trim().max(40).parse(formData.get("team_a_name") ?? "") || "Team A";
  const team_b_name =
    z.string().trim().max(40).parse(formData.get("team_b_name") ?? "") || "Team B";

  const service = createServiceClient();
  const { error } = await service
    .from("sprint_events")
    .insert({ name, audience, multiplier, team_a_name, team_b_name });
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

/* Put a member on team a, team b, or off the roster entirely. */
export async function assignSprintTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const event_id = z.string().uuid().parse(formData.get("event_id"));
  const profile_id = z.string().uuid().parse(formData.get("profile_id"));
  const team = z.enum(["a", "b", "none"]).parse(formData.get("team"));

  const service = createServiceClient();
  if (team === "none") {
    const { error } = await service
      .from("sprint_rosters")
      .delete()
      .eq("event_id", event_id)
      .eq("profile_id", profile_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service
      .from("sprint_rosters")
      .upsert({ event_id, profile_id, team });
    if (error) throw new Error(error.message);
    // Entries already submitted follow their submitter onto the new team.
    await service
      .from("sprint_entries")
      .update({ team })
      .eq("event_id", event_id)
      .eq("profile_id", profile_id);
  }
  revalidatePath("/admin/sprint");
  revalidatePath("/sprint");
}

const reviewSchema = z.object({
  entry_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reject_reason: z.string().trim().max(300).optional(),
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
