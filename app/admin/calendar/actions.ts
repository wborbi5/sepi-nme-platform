"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient, requireAdmin } from "@/lib/supabase/admin";

const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional(),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  week_number: z.union([z.coerce.number().int().min(0).max(52), z.literal("")]).optional(),
});

function toRow(parsed: z.infer<typeof eventSchema>) {
  return {
    title: parsed.title,
    event_date: parsed.event_date,
    start_time: parsed.start_time || null,
    location: parsed.location || null,
    description: parsed.description || null,
    week_number:
      parsed.week_number === "" || parsed.week_number == null
        ? null
        : parsed.week_number,
  };
}

export async function createCalEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = eventSchema.parse(Object.fromEntries(formData.entries()));
  const service = createServiceClient();
  const { error } = await service.from("cal_events").insert(toRow(parsed));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}

export async function updateCalEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = eventSchema.parse(Object.fromEntries(formData.entries()));
  const service = createServiceClient();
  const { error } = await service.from("cal_events").update(toRow(parsed)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}

export async function deleteCalEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const service = createServiceClient();
  const { error } = await service.from("cal_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}
