import { z } from "zod";
import { optionalHttpUrl } from "@/lib/http-url";

/*
 * Profile create/edit. Full name is the only required field.
 * Major, year, pledge class, bio, and LinkedIn are optional.
 * Text is trimmed. URLs accept bare domains and tracking params.
 */

const LINKEDIN_MESSAGE =
  "LinkedIn should look like linkedin.com/in/your-name. Tracking parameters are fine, or leave it blank.";
const YEAR_MESSAGE = "Graduation year should be a year like 2028, or leave it blank.";

function optionalText(max: number, message: string) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(max, message).transform((value) => value || null)
  );
}

function csvToArray(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 40);
}

const gradYear = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z.string().trim().transform((text, ctx) => {
    if (!text) return null;
    const direct = /^\d{4}$/.test(text) ? text : null;
    const found = text.match(/\b(?:19|20)\d{2}\b/g);
    const yearText = direct ?? (found && found.length === 1 ? found[0] : null);
    if (!yearText) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: YEAR_MESSAGE });
      return z.NEVER;
    }
    const year = Number(yearText);
    if (year < 1900 || year > 2200) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: YEAR_MESSAGE });
      return z.NEVER;
    }
    return year;
  })
);

const linkedinUrl = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().transform((value, ctx) => {
    const parsed = optionalHttpUrl(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: LINKEDIN_MESSAGE });
      return z.NEVER;
    }
    return parsed.value;
  })
);

export const profileSchema = z.object({
  full_name: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(120, "Full name must be 120 characters or fewer.")
  ),
  major: optionalText(200, "Major must be 200 characters or fewer."),
  grad_year: gradYear,
  pledge_class: optionalText(80, "Pledge class must be 80 characters or fewer."),
  bio: optionalText(5000, "Bio must be 5,000 characters or fewer."),
  linkedin_url: linkedinUrl,
  summer_27_plan: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(["internship", "build_business", "free_ball", "other", ""], {
        errorMap: () => ({
          message: "Summer plan should be internship, build a business, free ball, other, or blank.",
        }),
      })
      .transform((value) => value || null)
  ),
  summer_27_plan_other: optionalText(500, "Summer plan note must be 500 characters or fewer."),
  skills: optionalText(1000, "Skills must be 1,000 characters or fewer."),
  interests: optionalText(1000, "Interests must be 1,000 characters or fewer."),
  avatar_path: optionalText(500, "That photo path is too long. Upload the photo again."),
  resume_path: optionalText(500, "That resume path is too long. Upload the resume again."),
});

export type ProfileFormValue = {
  full_name: string;
  major: string | null;
  grad_year: number | null;
  pledge_class: string | null;
  bio: string | null;
  linkedin_url: string | null;
  summer_27_plan: "internship" | "build_business" | "free_ball" | "other" | null;
  summer_27_plan_other: string | null;
  skills: string[];
  interests: string[];
  avatar_path: string | null;
  resume_path: string | null;
};

export function parseProfileForm(
  raw: Record<string, unknown>
): { ok: true; value: ProfileFormValue } | { ok: false; error: string } {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const data = parsed.data;
  return {
    ok: true,
    value: {
      full_name: data.full_name,
      major: data.major,
      grad_year: data.grad_year,
      pledge_class: data.pledge_class,
      bio: data.bio,
      linkedin_url: data.linkedin_url,
      summer_27_plan: data.summer_27_plan,
      summer_27_plan_other:
        data.summer_27_plan === "other" ? data.summer_27_plan_other : null,
      skills: csvToArray(data.skills),
      interests: csvToArray(data.interests),
      avatar_path: data.avatar_path,
      resume_path: data.resume_path,
    },
  };
}

/** Onboarding is done once a name and a profile slug exist. Major and year can wait. */
export function profileNeedsOnboarding(
  profile: { full_name?: string | null; slug?: string | null } | null | undefined
): boolean {
  return !profile?.full_name?.trim() || !profile?.slug?.trim();
}
