import type { MemberCard } from "@/lib/types";

/**
 * Deterministic member ranking.
 *
 * Two jobs. It narrows the roster before the model sees it, and it is the
 * complete answer when no model key is configured — the assistant degrades to
 * a good search box rather than to an error page.
 */

const STOP = new Set([
  "who","should","i","ask","about","the","a","an","is","are","can","help","me",
  "with","for","to","of","in","on","and","or","what","which","how","do","does",
  "someone","anyone","best","talk","good","at","my","need","looking","find",
  "know","knows","any","people","person","member","members","sepi","that","this",
]);

export function terms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Crude stem so "designing" matches "design" without pulling in a library. */
function stem(word: string): string {
  return word.replace(/(ing|ed|es|s)$/u, "");
}

function hits(needle: string, haystack: string[] | null | undefined): number {
  if (!haystack?.length) return 0;
  const n = stem(needle);
  return haystack.filter((h) => {
    const v = stem(h.toLowerCase());
    return v.includes(n) || n.includes(v);
  }).length;
}

function textHit(needle: string, text: string | null | undefined): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(stem(needle));
}

export type Scored = {
  member: MemberCard;
  score: number;
  /** Human-readable justification, so the fallback answer is not a bare list. */
  because: string[];
};

/**
 * Weighted so an explicit "ask me about" beats an incidental bio mention. A
 * member who volunteered a topic wants the question; someone whose bio happens
 * to contain the word does not.
 */
export function rankMembers(query: string, members: MemberCard[]): Scored[] {
  const words = terms(query);
  if (words.length === 0) return [];

  return members
    .map((member) => {
      let score = 0;
      const because: string[] = [];

      for (const word of words) {
        const ask = hits(word, member.ask_me_about);
        if (ask) {
          score += 10 * ask;
          because.push(`lists ${word} under ask-me-about`);
        }

        const skill = hits(word, member.skills);
        if (skill) {
          score += 6 * skill;
          because.push(`has ${word} as a skill`);
        }

        const interest = hits(word, member.interests);
        if (interest) {
          score += 3 * interest;
          because.push(`is interested in ${word}`);
        }

        if (textHit(word, member.superpower)) {
          score += 7;
          because.push(`says they are unreasonably good at this`);
        }
        if (textHit(word, member.currently)) {
          score += 5;
          because.push(`is working on it right now`);
        }
        if (textHit(word, member.headline)) score += 4;
        if (textHit(word, member.company_summary)) {
          score += 4;
          because.push(`their company touches it`);
        }
        if (textHit(word, member.major)) score += 2;

        // Someone who needs the same thing is not the person to ask, but they
        // are worth surfacing quietly — shared problems are worth knowing about.
        if (hits(word, member.need_help_with)) score += 1;
      }

      // Current members carry the experience new members are shopping for.
      if (score > 0 && member.role === "current_member") score += 2;

      return { member, score, because: [...new Set(because)] };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Compact text block for the model. One line per member, no private fields. */
export function toContextBlock(members: MemberCard[]): string {
  return members
    .map((m) => {
      const bits = [
        `slug: ${m.slug}`,
        `name: ${m.full_name}`,
        `role: ${m.role}`,
        m.major ? `major: ${m.major}` : null,
        m.grad_year ? `grad: ${m.grad_year}` : null,
        m.energy ? `mode: ${m.energy}` : null,
        m.headline ? `headline: ${m.headline}` : null,
        m.currently ? `now: ${m.currently}` : null,
        m.superpower ? `great at: ${m.superpower}` : null,
        m.ask_me_about?.length ? `ask about: ${m.ask_me_about.join(", ")}` : null,
        m.need_help_with?.length ? `needs help: ${m.need_help_with.join(", ")}` : null,
        m.skills?.length ? `skills: ${m.skills.join(", ")}` : null,
        m.interests?.length ? `interests: ${m.interests.join(", ")}` : null,
        m.company_summary ? `company: ${m.company_summary}` : null,
      ].filter(Boolean);
      return `- ${bits.join(" | ")}`;
    })
    .join("\n");
}

/** The no-model-key answer. Reads like a person, built from the ranking. */
export function fallbackAnswer(query: string, scored: Scored[]): string {
  if (scored.length === 0) {
    return `Nobody's profile mentions that. Try a broader word, or check the full member list — the assistant only knows what people wrote about themselves.`;
  }

  const top = scored.slice(0, 3);
  const lines = top.map((s) => {
    const name = s.member.full_name ?? "A member";
    const why = s.because[0] ?? "their profile matches";
    const extra = s.member.currently ? ` They are on ${s.member.currently}` : "";
    return `**${name}** — ${why}.${extra}`;
  });

  const lead =
    top.length === 1
      ? "One person stands out:"
      : `Start with ${top[0].member.full_name?.split(" ")[0] ?? "the first"}:`;

  return `${lead}\n\n${lines.join("\n\n")}`;
}
