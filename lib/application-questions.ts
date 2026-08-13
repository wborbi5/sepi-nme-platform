/**
 * Accelerator Application wording.
 *
 * Lives in TypeScript, never in a migration. The keys in Section 3 must match
 * the columns `application_public` reads — change a key here and the company
 * page goes blank. Change the *wording* freely.
 */

export type QuestionSection = 1 | 2 | 3;

export type Question = {
  id: string;
  section: QuestionSection;
  label: string;
  hint?: string;
  /** Section 3 is hard-capped at 400 with a live counter. */
  maxLength?: number;
  required: boolean;
  multiline: boolean;
};

export const SECTION_TITLE: Record<QuestionSection, string> = {
  1: "Company",
  2: "Idea",
  3: "Startup strategy",
};

export const SECTION_NOTE: Record<QuestionSection, string> = {
  1: "The two things that show up everywhere else in the app.",
  2: "Private. Only you, your big, and admins ever read this.",
  3: "Public on your company page. 400 characters each — write tight.",
};

export const QUESTIONS: Question[] = [
  {
    id: "company_name",
    section: 1,
    label: "Company name",
    required: true,
    multiline: false,
  },
  {
    id: "one_liner",
    section: 1,
    label: "One-liner",
    hint: "50 characters. If it does not fit, it is not one line yet.",
    maxLength: 50,
    required: true,
    multiline: false,
  },

  /* ------------------------------------------------- Section 2 — private */
  {
    id: "why_this_idea",
    section: 2,
    label: "Why did you pick this idea? Do you have domain expertise? How do you know people need this?",
    required: false,
    multiline: true,
  },
  {
    id: "competitors",
    section: 2,
    label: "Who are your competitors? What do you understand that they don't?",
    required: false,
    multiline: true,
  },
  {
    id: "problem",
    section: 2,
    label:
      "What problem are you solving? What is your target audience struggling with, and why are current solutions unsatisfying?",
    required: true,
    multiline: true,
  },
  {
    id: "winning_team",
    section: 2,
    label: "Why is your team a winning team? What is your unfair advantage?",
    required: true,
    multiline: true,
  },

  /* -------------------------------------------------- Section 3 — public */
  {
    id: "revenue_model",
    section: 3,
    label: "How do or will you make money? How much could you make?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
  {
    id: "target_audience",
    section: 3,
    label: "Who is your target audience?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
  {
    id: "competitive_advantage",
    section: 3,
    label: "What is your competitive advantage?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
  {
    id: "timing",
    section: 3,
    label: "Why is now the right timing?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
  {
    id: "customer_acquisition",
    section: 3,
    label: "What is your customer acquisition strategy?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
  {
    id: "milestones",
    section: 3,
    label: "What are your next major company milestones?",
    maxLength: 400,
    required: true,
    multiline: true,
  },
];

/** Short headings for the company page, where the full question is too long. */
export const PUBLIC_HEADINGS: Record<string, string> = {
  revenue_model: "How it makes money",
  target_audience: "Who it is for",
  competitive_advantage: "Why them",
  timing: "Why now",
  customer_acquisition: "How they get customers",
  milestones: "What is next",
};

export const PUBLIC_KEYS = [
  "revenue_model",
  "target_audience",
  "competitive_advantage",
  "timing",
  "customer_acquisition",
  "milestones",
] as const;

export type PublicKey = (typeof PUBLIC_KEYS)[number];

export const questionsInSection = (section: QuestionSection) =>
  QUESTIONS.filter((q) => q.section === section);

/**
 * Pass 1 escape hatch. Many new members have no venture on day one; without
 * this, half the cohort invents answers and the whole exercise is worthless.
 */
export const NO_VENTURE_QUESTIONS: Question[] = [
  {
    id: "problem_interest",
    section: 2,
    label: "What problem do you keep noticing?",
    hint: "Not a business. A thing that is annoying or broken that you cannot stop seeing.",
    required: true,
    multiline: true,
  },
  {
    id: "skills_bring",
    section: 2,
    label: "What could you contribute to someone else's team tomorrow?",
    required: true,
    multiline: true,
  },
];
