"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import { getMemberCards } from "@/lib/data";
import { fallbackAnswer, rankMembers, toContextBlock } from "@/lib/member-search";
import { createClient } from "@/lib/supabase/server";
import type { MemberCard } from "@/lib/types";

const questionSchema = z.string().trim().min(3, "Ask a real question.").max(400);

/** What the model must return. Slugs, not names — names are not unique. */
const AnswerSchema = z.object({
  answer: z
    .string()
    .describe(
      "Two or three sentences, plain text. Name the people and say why each one. No lists, no headings.",
    ),
  member_slugs: z
    .array(z.string())
    .max(4)
    .describe("Slugs of the members named in the answer, best first. Empty if none fit."),
});

export type AskResult =
  | { ok: true; answer: string; refs: { slug: string; name: string }[] }
  | { ok: false; error: string };

const SYSTEM = `You help members of Sigma Eta Pi's New Member Education program figure out who to talk to.

You are given the roster. Every fact in it was written by that member about themselves.

Rules:
- Only use the roster. Never invent a person, a skill, or a company.
- Name at most three people. Two is usually better.
- Say why each person, concretely, using their own words from the roster.
- If nobody fits, say so plainly and suggest a different angle. Do not stretch.
- Someone who listed a topic under "ask about" is a better answer than someone whose bio happens to mention it.
- A member who "needs help" with something is not the person to ask about it.
- Write like a member of the chapter talking to another member. No corporate voice, no bullet points, no "I'd be happy to".`;

export async function askQuestion(rawQuestion: unknown): Promise<AskResult> {
  const profile = await requireProfile();

  const parsed = questionSchema.safeParse(rawQuestion);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ask a real question." };
  }
  const question = parsed.data;

  const supabase = await createClient();
  const members = (await getMemberCards()).filter((m) => m.id !== profile.id);

  // Rank first, always. It narrows the prompt and it is the whole answer when
  // there is no model key.
  const scored = rankMembers(question, members);
  const shortlist: MemberCard[] =
    scored.length >= 3 ? scored.slice(0, 12).map((s) => s.member) : members.slice(0, 40);

  const record = async (answer: string, refs: { slug: string; name: string }[]) => {
    await supabase.from("chat_messages").insert([
      { profile_id: profile.id, role: "user", body: question },
      {
        profile_id: profile.id,
        role: "assistant",
        body: answer,
        refs: refs
          .map((r) => members.find((m) => m.slug === r.slug)?.id)
          .filter((id): id is string => Boolean(id)),
      },
    ]);
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Not an error state. The ranking is a real answer.
    const answer = fallbackAnswer(question, scored);
    const refs = scored.slice(0, 3).map((s) => ({
      slug: s.member.slug ?? "",
      name: s.member.full_name ?? "Member",
    }));
    await record(answer, refs);
    return { ok: true, answer, refs };
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: {
        effort: "low",
        format: zodOutputFormat(AnswerSchema),
      },
      messages: [
        {
          role: "user",
          content: `Roster:\n${toContextBlock(shortlist)}\n\nQuestion from ${
            profile.full_name ?? "a member"
          }: ${question}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("declined");
    }

    const output = response.parsed_output;
    if (!output) throw new Error("unparsed");

    // Never trust the slugs — resolve every one against the roster we sent.
    const refs = output.member_slugs
      .map((slug) => members.find((m) => m.slug === slug))
      .filter((m): m is MemberCard => Boolean(m))
      .map((m) => ({ slug: m.slug ?? "", name: m.full_name ?? "Member" }));

    await record(output.answer, refs);
    return { ok: true, answer: output.answer, refs };
  } catch {
    // Model unreachable, refused, or malformed — the ranking still stands.
    const answer = fallbackAnswer(question, scored);
    const refs = scored.slice(0, 3).map((s) => ({
      slug: s.member.slug ?? "",
      name: s.member.full_name ?? "Member",
    }));
    await record(answer, refs);
    return { ok: true, answer, refs };
  }
}
