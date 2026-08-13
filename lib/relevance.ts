import { ENERGY_LABEL, type Profile } from "@/lib/types";
import { list } from "@/lib/format";

/**
 * What this person means *to you*.
 *
 * A profile that shows everyone the same thing is a directory entry. The point
 * of asking members what they can help with and what they need is that the
 * intersection is computable — so the top of a profile answers "why am I
 * looking at this person" before it answers "who is this person".
 *
 * Ordered by strength. The page shows the first two or three.
 */

export type Relevance = {
  id: string;
  /** How loud it should be. `direct` is the one that gets the accent color. */
  weight: "direct" | "strong" | "context";
  text: string;
};

const norm = (s: string) => s.trim().toLowerCase();

function overlap(a: string[] | null, b: string[] | null): string[] {
  if (!a?.length || !b?.length) return [];
  const set = new Set(b.map(norm));
  const seen = new Set<string>();
  return a.filter((item) => {
    const key = norm(item);
    if (!set.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function relevanceFor(
  subject: Profile,
  viewer: Profile,
  opts: { subjectInvestable?: boolean } = {},
): Relevance[] {
  if (subject.id === viewer.id) return [];

  const out: Relevance[] = [];

  // 1. They know the thing you said you were stuck on.
  const theyHelp = overlap(subject.ask_me_about, viewer.need_help_with);
  if (theyHelp.length) {
    out.push({
      id: "they-help",
      weight: "direct",
      text: `You said you need help with ${list(theyHelp)}. That is on their list.`,
    });
  }

  // 2. The trade goes both ways, which is the thing that makes people ask.
  const youHelp = overlap(viewer.ask_me_about, subject.need_help_with);
  if (youHelp.length) {
    out.push({
      id: "you-help",
      weight: youHelp.length && theyHelp.length ? "strong" : "direct",
      text: `They are looking for ${list(youHelp)} — you listed that.`,
    });
  }

  // 3. Family.
  if (subject.big_id === viewer.id) {
    out.push({ id: "little", weight: "strong", text: "Your little." });
  } else if (viewer.big_id === subject.id) {
    out.push({ id: "big", weight: "strong", text: "Your big." });
  } else if (subject.big_id && subject.big_id === viewer.big_id) {
    out.push({ id: "sibling", weight: "context", text: "Same big as you." });
  }

  // 4. Money, if you are the one holding it.
  if (opts.subjectInvestable && (viewer.role === "current_member" || viewer.role === "admin")) {
    out.push({
      id: "investable",
      weight: "strong",
      text: "Their company is open for investment.",
    });
  }

  // 5. Softer common ground.
  const sharedInterests = overlap(subject.interests, viewer.interests);
  if (sharedInterests.length) {
    out.push({
      id: "interests",
      weight: "context",
      text: `Both of you are into ${list(sharedInterests, 2)}.`,
    });
  }

  const sharedSkills = overlap(subject.skills, viewer.skills);
  if (sharedSkills.length && !sharedInterests.length) {
    out.push({
      id: "skills",
      weight: "context",
      text: `You both work in ${list(sharedSkills, 2)}.`,
    });
  }

  if (subject.major && subject.major === viewer.major) {
    out.push({ id: "major", weight: "context", text: `Also ${subject.major}.` });
  } else if (subject.grad_year && subject.grad_year === viewer.grad_year) {
    out.push({ id: "year", weight: "context", text: `Class of ${subject.grad_year}, same as you.` });
  }

  if (subject.hometown && subject.hometown === viewer.hometown) {
    out.push({ id: "home", weight: "context", text: `Also from ${subject.hometown}.` });
  }

  return out;
}

/**
 * The one-line read under someone's name. Their own words if they gave any,
 * their working mode if they did not. Never blank — a blank line here makes a
 * person look like an empty row.
 */
export function vibeLine(profile: Profile): string {
  if (profile.headline) return profile.headline;
  if (profile.energy) return ENERGY_LABEL[profile.energy];
  if (profile.currently) return profile.currently;
  if (profile.major) {
    return profile.grad_year ? `${profile.major} · ${profile.grad_year}` : profile.major;
  }
  return "Still filling this in";
}
