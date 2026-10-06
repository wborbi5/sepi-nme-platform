import { z } from "zod";

/*
 * LinkedIn URLs pasted into the mentor directory. Canonical form is what we
 * store, so "www", a trailing slash, and tracking params do not create
 * duplicates. No LinkedIn API — the slug is only a placeholder name.
 */

const inputSchema = z.string().trim().min(1).max(500);

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

  let url: URL;
  try {
    url = new URL(parsed.data);
  } catch {
    return { ok: false, error: "Paste a LinkedIn profile URL." };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "linkedin.com") {
    return { ok: false, error: "Use a linkedin.com/in/ profile link." };
  }

  const path = decodeURIComponent(url.pathname).replace(/\/+$/, "");
  const profile = path.match(/^\/in\/([^/]+)$/i);
  const company = path.match(/^\/company\/([^/]+)$/i);
  const kind = profile ? "in" : company ? "company" : null;
  const slug = (profile?.[1] ?? company?.[1] ?? "").toLowerCase();

  if (!kind || !/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: "Use a linkedin.com/in/ profile link." };
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
