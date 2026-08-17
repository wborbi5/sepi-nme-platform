/*
 * Accelerator Application — question definitions.
 *
 * Wording lives HERE, not in the database. Changing a question is a
 * TypeScript edit, never a migration. Answers store as JSONB keyed by
 * these keys; the six Section 3 keys MUST match what the
 * application_public view reads: revenue_model, target_audience,
 * competitive_advantage, timing, customer_acquisition, milestones.
 */

export type Question = {
  key: string;
  label: string;
  required: boolean;
  maxLength?: number;
  rows?: number;
};

export type Section = {
  id: "company" | "idea" | "strategy";
  title: string;
  note?: string;
  public: boolean;
  questions: Question[];
};

export const SECTIONS: Section[] = [
  {
    id: "company",
    title: "Section 1 — Company",
    public: true,
    questions: [
      { key: "company_name", label: "Company name", required: true, maxLength: 80, rows: 1 },
      { key: "one_liner", label: "One-liner", required: true, maxLength: 50, rows: 1 },
    ],
  },
  {
    id: "idea",
    title: "Section 2 — Idea",
    note: "Private. Only your founding team, your big, and admins can read this section.",
    public: false,
    questions: [
      {
        key: "idea_origin",
        label:
          "Why did you pick this idea? Do you have domain expertise? How do you know people need this?",
        required: false,
        rows: 5,
      },
      {
        key: "competitors",
        label: "Who are your competitors? What do you understand that they don't?",
        required: false,
        rows: 5,
      },
      {
        key: "problem",
        label:
          "What problem are you solving? What is your target audience struggling with, and why are current solutions unsatisfying?",
        required: true,
        rows: 6,
      },
      {
        key: "team_advantage",
        label: "Why is your team a winning team? What is your unfair advantage?",
        required: true,
        rows: 5,
      },
    ],
  },
  {
    id: "strategy",
    title: "Section 3 — Startup Strategy",
    note: "Public. These six answers appear on your company page.",
    public: true,
    questions: [
      { key: "revenue_model", label: "How do or will you make money? How much could you make?", required: true, maxLength: 400, rows: 4 },
      { key: "target_audience", label: "Who is your target audience?", required: true, maxLength: 400, rows: 4 },
      { key: "competitive_advantage", label: "What is your competitive advantage?", required: true, maxLength: 400, rows: 4 },
      { key: "timing", label: "Why is now the right timing?", required: true, maxLength: 400, rows: 4 },
      { key: "customer_acquisition", label: "What is your customer acquisition strategy?", required: true, maxLength: 400, rows: 4 },
      { key: "milestones", label: "What are your next major company milestones?", required: true, maxLength: 400, rows: 4 },
    ],
  },
];

/*
 * Pass 1 escape hatch. Many new members have no venture on day one —
 * capture problem interest and skills instead of forcing fabrication.
 * Unlocks the full form at Pass 2.
 */
export const NO_VENTURE_QUESTIONS: Question[] = [
  {
    key: "problem_interest",
    label: "What problems or spaces are you drawn to? What would you want to build in?",
    required: true,
    rows: 5,
  },
  {
    key: "skills_offer",
    label: "What skills do you bring a founding team? What do you want to learn?",
    required: true,
    rows: 5,
  },
];

/* Validate a submission server-side. Returns error strings, empty = valid. */
export function validateAnswers(
  answers: Record<string, string>,
  opts: { noVenture: boolean }
): string[] {
  const errors: string[] = [];
  if (opts.noVenture) {
    for (const q of NO_VENTURE_QUESTIONS) {
      if (q.required && !answers[q.key]?.trim())
        errors.push(`"${q.label}" is required`);
    }
    return errors;
  }
  for (const section of SECTIONS) {
    for (const q of section.questions) {
      const v = answers[q.key]?.trim() ?? "";
      if (q.required && !v) errors.push(`"${q.label}" is required`);
      if (q.maxLength && v.length > q.maxLength)
        errors.push(`"${q.label}" is over the ${q.maxLength} character cap`);
    }
  }
  return errors;
}
