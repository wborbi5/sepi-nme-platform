import { z } from "zod";
import { normalizeOptionalUrl } from "@/lib/http-url";

/*
 * LinkedIn URLs pasted into the mentor directory. Canonical form is what we
 * store, so "www", a trailing slash, and tracking params do not create
 * duplicates. No LinkedIn API — the slug is only a placeholder name.
 */

const inputSchema = z.string().trim().min(1).max(2000);

export type ParsedMentor = {
  linkedin_url: string;
  linkedin_slug: string;
  display_name: string;
};

export function parseMentorUrl(
  raw: string
): { ok: true; mentor: ParsedMentor } | { ok: false; error: string } {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Paste a LinkedIn profile URL." };
  }

  const normalized = normalizeOptionalUrl(parsed.data);
  let url: URL;
  try {
    url = new URL(normalized ?? "");
  } catch {
    return { ok: false, error: "Use a link like linkedin.com/in/name. Tracking parameters are fine." };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) {
    return { ok: false, error: "Use a linkedin.com/in/ or linkedin.com/company/ link." };
  }

  const path = decodeURIComponent(url.pathname).replace(/\/+$/, "");
  const profile = path.match(/^\/in\/([^/]+)$/i);
  const company = path.match(/^\/company\/([^/]+)$/i);
  const kind = profile ? "in" : company ? "company" : null;
  const slug = (profile?.[1] ?? company?.[1] ?? "").toLowerCase();

  // Letters (including accents), numbers, underscores, and hyphens.
  if (!kind || !/^[\p{L}\p{N}_-]+$/u.test(slug)) {
    return { ok: false, error: "Use a linkedin.com/in/ or linkedin.com/company/ link." };
  }

  return {
    ok: true,
    mentor: {
      linkedin_url: `https://www.linkedin.com/${kind}/${slug}`,
      linkedin_slug: slug,
      display_name: titleFromSlug(slug),
    },
  };
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
