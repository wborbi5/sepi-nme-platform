import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedResume } from "@/lib/resume-parser";

/*
 * Draft a member's bio from what we already know about them: parsed
 * resume, self-listed skills and interests, major, pledge class,
 * LinkedIn. The member always edits before saving — this writes the
 * first draft, not the record.
 *
 * Without ANTHROPIC_API_KEY this returns a clear "not configured"
 * message and nothing else changes.
 */

export type BioInput = {
  full_name: string | null;
  major: string | null;
  grad_year: number | null;
  pledge_class: string | null;
  position: string | null;
  skills: string[];
  interests: string[];
  linkedin_url: string | null;
  resume_parsed: ParsedResume | null;
};

export async function generateBio(
  input: BioInput
): Promise<{ ok: boolean; bio?: string; message: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, message: "Bio writing is not configured yet (no Claude API key)" };
  }

  const facts: string[] = [];
  if (input.full_name) facts.push(`Name: ${input.full_name}`);
  if (input.major) facts.push(`Major: ${input.major}`);
  if (input.grad_year) facts.push(`Graduation year: ${input.grad_year}`);
  if (input.pledge_class) facts.push(`Pledged Sigma Eta Pi: ${input.pledge_class}`);
  if (input.position) facts.push(`Chapter position: ${input.position}`);
  if (input.skills.length) facts.push(`Self-listed skills: ${input.skills.join(", ")}`);
  if (input.interests.length) facts.push(`Interests: ${input.interests.join(", ")}`);
  if (input.resume_parsed?.status === "done") {
    if (input.resume_parsed.summary)
      facts.push(`Resume summary: ${input.resume_parsed.summary}`);
    for (const job of input.resume_parsed.experience ?? []) {
      facts.push(
        `Experience: ${[job.title, job.organization].filter(Boolean).join(" at ")}` +
          (job.highlights?.length ? ` — ${job.highlights.join("; ")}` : "")
      );
    }
    if (input.resume_parsed.skills?.length)
      facts.push(`Resume skills: ${input.resume_parsed.skills.join(", ")}`);
  }

  if (facts.length < 2) {
    return {
      ok: false,
      message:
        "Not enough to work with yet — add a major, skills, or upload a resume first",
    };
  }

  // Structured output is the harness: the schema guarantees the shape
  // (two-sentence intro + bullet list) so formatting never depends on
  // the model behaving — and post-processing enforces the caps.
  const BIO_SCHEMA = {
    type: "object" as const,
    additionalProperties: false,
    required: ["intro", "bullets"],
    properties: {
      intro: {
        type: "string",
        description:
          "EXACTLY two sentences, third person. Sentence 1: who they are in the most concrete terms available. Sentence 2: the single most impressive or distinct thing about them. No filler, no 'passionate about'.",
      },
      bullets: {
        type: "array",
        items: { type: "string" },
        description:
          "3 to 5 hard-hitting bullets. Each is a fragment (no ending period), max ~10 words, leads with a verb or a number, and carries one concrete fact — a company, a metric, a skill in action. Never vague ('strong work ethic'), never a rephrase of another bullet. Do not include a bullet character; just the text.",
      },
    },
  };

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: BIO_SCHEMA,
        },
      },
      system:
        "You write member bios for the Sigma Eta Pi entrepreneurship fraternity portal at Miami University. " +
        "Ground every claim in the provided facts — never invent employers, achievements, or numbers; " +
        "if a number exists in the facts, use it. Translate resume jargon into plain language a freshman understands. " +
        "Vary the opening — do not start with the person's name followed by their major. " +
        "No hashtags, no emoji, no buzzwords ('driven', 'dynamic', 'results-oriented').",
      messages: [
        {
          role: "user",
          content: `Write the bio from these facts:\n\n${facts.join("\n")}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, message: "The model declined this request — try again" };
    }
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!raw) return { ok: false, message: "Empty draft — try again" };

    const parsed = JSON.parse(raw) as { intro: string; bullets: string[] };

    // Post-process: cap at two sentences and five bullets no matter what.
    const sentences = parsed.intro.match(/[^.!?]+[.!?]+/g) ?? [parsed.intro];
    const intro = sentences.slice(0, 2).join(" ").trim();
    const bullets = (parsed.bullets ?? [])
      .map((b) => b.replace(/^[-•*]\s*/, "").replace(/\.$/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    const bio = `${intro}\n\n${bullets.map((b) => `• ${b}`).join("\n")}`;
    return { ok: true, bio, message: "Draft ready — edit it to make it yours" };
  } catch (err) {
    console.error("bio generation failed:", err);
    return { ok: false, message: "Bio generation failed — try again in a minute" };
  }
}
