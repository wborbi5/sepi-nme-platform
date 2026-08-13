"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ChipsInput } from "@/components/chips-input";
import { ImageUpload } from "@/components/image-upload";
import { Button, Divider, Field, Input, SectionHead, Textarea } from "@/components/ui";
import { updateProfile } from "@/app/actions/profile";
import { cn } from "@/lib/cn";
import { ENERGY_OPTIONS } from "@/lib/onboarding";
import { avatarPath, avatarUrl } from "@/lib/storage";
import type { Profile } from "@/lib/types";

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    pronouns: profile.pronouns ?? "",
    major: profile.major ?? "",
    grad_year: profile.grad_year != null ? String(profile.grad_year) : "",
    hometown: profile.hometown ?? "",
    headline: profile.headline ?? "",
    currently: profile.currently ?? "",
    superpower: profile.superpower ?? "",
    origin: profile.origin ?? "",
    fun_fact: profile.fun_fact ?? "",
    bio: profile.bio ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    energy: profile.energy ?? "",
    avatar_path: profile.avatar_path ?? "",
  });

  const [ask, setAsk] = useState<string[]>(profile.ask_me_about ?? []);
  const [need, setNeed] = useState<string[]>(profile.need_help_with ?? []);
  const [style, setStyle] = useState<string[]>(profile.working_style ?? []);
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({
        ...form,
        ask_me_about: ask,
        need_help_with: need,
        working_style: style,
        skills,
        interests,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8 pb-24">
      <section>
        <SectionHead title="Photo" />
        <ImageUpload
          bucket="avatars"
          path={avatarPath(profile.id)}
          currentUrl={avatarUrl(profile.avatar_path)}
          label="Photo"
          onUploaded={(path) => set("avatar_path", path)}
        />
      </section>

      <Divider />

      <section className="space-y-4">
        <SectionHead title="You" />
        <Field label="Full name">
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pronouns" optional>
            <Input value={form.pronouns} onChange={(e) => set("pronouns", e.target.value)} />
          </Field>
          <Field label="Hometown" optional>
            <Input value={form.hometown} onChange={(e) => set("hometown", e.target.value)} />
          </Field>
          <Field label="Major">
            <Input value={form.major} onChange={(e) => set("major", e.target.value)} />
          </Field>
          <Field label="Grad year">
            <Input
              value={form.grad_year}
              onChange={(e) => set("grad_year", e.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>
      </section>

      <Divider />

      <section className="space-y-4">
        <SectionHead title="How you read" />

        <Field
          label="One line about you"
          hint={`Shown under your name everywhere · ${form.headline.length}/90`}
        >
          <Input
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            maxLength={90}
          />
        </Field>

        <div>
          <div className="mb-2 text-[13px] font-medium text-[var(--cloud-white)]">
            Your default mode
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ENERGY_OPTIONS.map((option) => {
              const on = form.energy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("energy", on ? "" : option.value)}
                  title={option.detail}
                  className={cn(
                    "min-h-0 rounded-full border px-3 py-1.5 text-[12px]",
                    on
                      ? "border-[var(--cloud-white)] bg-[var(--cloud-white)] text-[var(--midnight)]"
                      : "border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Right now" hint={`${form.currently.length}/240`}>
          <Textarea
            value={form.currently}
            onChange={(e) => set("currently", e.target.value)}
            maxLength={240}
          />
        </Field>

        <Field label="Unreasonably good at" hint={`${form.superpower.length}/160`}>
          <Input
            value={form.superpower}
            onChange={(e) => set("superpower", e.target.value)}
            maxLength={160}
          />
        </Field>

        <Field label="How you got here" optional hint={`${form.origin.length}/400`}>
          <Textarea
            value={form.origin}
            onChange={(e) => set("origin", e.target.value)}
            maxLength={400}
          />
        </Field>

        <Field label="One thing people would not guess" optional>
          <Input
            value={form.fun_fact}
            onChange={(e) => set("fun_fact", e.target.value)}
            maxLength={160}
          />
        </Field>
      </section>

      <Divider />

      <section className="space-y-5">
        <SectionHead title="The trade" />

        <ChipField label="Ask me about" value={ask} onChange={setAsk} hint="What the assistant searches when someone asks who to talk to." />
        <ChipField label="I need help with" value={need} onChange={setNeed} hint="This is what shows on other people's screens as a way in." />
        <ChipField label="Skills" value={skills} onChange={setSkills} />
        <ChipField label="Interests" value={interests} onChange={setInterests} />
        <ChipField label="Working style" value={style} onChange={setStyle} />
      </section>

      <Divider />

      <section className="space-y-4">
        <SectionHead title="Elsewhere" />
        <Field label="LinkedIn" optional>
          <Input
            value={form.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
            inputMode="url"
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field label="Anything else" optional hint="Long form. Nobody has to read it.">
          <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1000} />
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending} className="flex-1">
            {pending ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span className="text-[13px] text-[var(--color-success)]">Saved</span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ChipField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-[var(--cloud-white)]">{label}</div>
      <ChipsInput value={value} onChange={onChange} />
      {hint ? <p className="mt-1.5 text-[12px] text-[var(--color-text-dim)]">{hint}</p> : null}
    </div>
  );
}
