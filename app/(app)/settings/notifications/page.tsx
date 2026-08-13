import { revalidatePath } from "next/cache";

import { Button, Divider } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Email settings · SEPi NME" };

/**
 * The four emails this app is allowed to send. Everything else stays in-app —
 * email is the escalation channel, not the default one.
 */
const EMAIL_TYPES = [
  {
    key: "investment_received",
    label: "Someone invests in your company",
    detail: "Includes the 72-hour deadline. Turning this off is a bad idea.",
  },
  {
    key: "investment_reminder",
    label: "24 hours left to respond",
    detail: "One reminder, only while an investment is still pending.",
  },
  {
    key: "investment_declined",
    label: "Your investment was declined",
    detail: "So you know the money is back in your balance.",
  },
  {
    key: "sprint_rejected",
    label: "A sprint entry was rejected",
    detail: "With the reason, so you can fix and resubmit.",
  },
  {
    key: "weekly_digest",
    label: "Monday digest",
    detail: "Sessions this week, deadlines, and anything pending your action.",
  },
];

async function savePrefs(formData: FormData) {
  "use server";
  const profile = await requireProfile();
  const supabase = await createClient();

  // Absent key means opted in, so only write the offs.
  const prefs: Record<string, boolean> = {};
  for (const { key } of EMAIL_TYPES) {
    if (formData.get(key) === null) prefs[key] = false;
  }

  await supabase.from("profiles").update({ email_prefs: prefs }).eq("id", profile.id);
  revalidatePath("/settings/notifications");
}

export default async function EmailSettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("email_prefs")
    .eq("id", profile.id)
    .single();

  const prefs = ((data?.email_prefs ?? {}) as Record<string, boolean>) ?? {};

  return (
    <div className="mx-auto max-w-[560px]">
      <header className="mb-6 border-b border-[var(--color-border)] pb-5">
        <h1 className="text-[28px] leading-none text-[var(--cloud-white)]">Email</h1>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          We only email when something needs an answer from you. Everything else lives in the
          app.
        </p>
      </header>

      <form action={savePrefs}>
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {EMAIL_TYPES.map((type) => (
            <li key={type.key}>
              <label className="flex cursor-pointer items-start gap-3 py-4">
                <input
                  type="checkbox"
                  name={type.key}
                  defaultChecked={prefs[type.key] !== false}
                  className="mt-0.5 h-[18px] min-h-0 w-[18px] shrink-0 accent-[var(--cobalt-lift)]"
                />
                <span className="min-w-0">
                  <span className="block text-[15px] text-[var(--cloud-white)]">
                    {type.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--color-text-dim)]">
                    {type.detail}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <Button type="submit" className="mt-6 w-full">
          Save
        </Button>
      </form>

      <Divider className="my-8" />

      <p className="text-[12px] leading-[1.5] text-[var(--color-text-dim)]">
        Signed in as {profile.email}. Only an admin can change the email on an account.
      </p>
    </div>
  );
}
