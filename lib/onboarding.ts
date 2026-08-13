import { ENERGY_LABEL, ENERGY_ORDER, type MemberTrack, type Profile } from "@/lib/types";

/**
 * Onboarding wording lives here, not in a migration and not scattered through
 * JSX — same rule as lib/application-questions.ts. Changing a question is a
 * TypeScript edit.
 *
 * The whole flow is: one question that decides the branch, then four or five
 * short steps. Nothing is longer than a screen at 375px, and nothing asks for
 * a paragraph when a phrase will do.
 */

export type FieldType = "text" | "textarea" | "number" | "chips" | "choice" | "energy";

export type OnboardingField = {
  name: keyof Profile & string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  optional?: boolean;
  suggestions?: string[];
  options?: { value: string; label: string; detail?: string }[];
};

export type OnboardingStep = {
  id: string;
  /** Shown big, in Fraunces. Keep it to five words. */
  title: string;
  /** One line under it, or nothing. */
  caption?: string;
  fields: OnboardingField[];
};

/* ------------------------------------------------------------ suggestions */

const ASK_SUGGESTIONS = [
  "cold outreach",
  "landing pages",
  "user interviews",
  "pitch decks",
  "Figma",
  "Python",
  "video editing",
  "finance models",
  "supply chain",
  "brand",
  "sales calls",
  "SEO",
  "AI tooling",
  "hardware",
  "legal basics",
  "fundraising",
];

const HELP_SUGGESTIONS = [
  "finding my first customer",
  "narrowing my idea",
  "a technical cofounder",
  "designing the thing",
  "pricing",
  "getting intros",
  "telling the story",
  "shipping faster",
  "market research",
  "staying accountable",
];

const STYLE_SUGGESTIONS = [
  "early mornings",
  "late nights",
  "works out loud",
  "heads-down",
  "whiteboard first",
  "ship then fix",
  "reads the docs",
  "in person",
  "async",
];

/* ------------------------------------------------------------------ steps */

/** Step 1. The answer decides everything after it. */
export const TRACK_STEP: OnboardingStep = {
  id: "track",
  title: "Which one are you?",
  fields: [
    {
      name: "member_track",
      label: "Member type",
      type: "choice",
      options: [
        {
          value: "new",
          label: "New member",
          detail: "In the fall NME cohort. You are building something, or about to be.",
        },
        {
          value: "current",
          label: "Current member",
          detail: "Founding class. You have $200,000 to deploy and littles to back.",
        },
      ],
    },
  ],
};

const IDENTITY_STEP: OnboardingStep = {
  id: "identity",
  title: "The basics",
  fields: [
    { name: "full_name", label: "Full name", type: "text", placeholder: "Wyatt Borbi" },
    { name: "pronouns", label: "Pronouns", type: "text", optional: true, placeholder: "they/them" },
    { name: "major", label: "Major", type: "text", placeholder: "Entrepreneurship" },
    { name: "grad_year", label: "Grad year", type: "number", placeholder: "2029" },
    { name: "hometown", label: "Hometown", type: "text", optional: true, placeholder: "Cleveland, OH" },
  ],
};

const ENERGY_STEP: OnboardingStep = {
  id: "energy",
  title: "How do you work?",
  caption: "Pick the one that is most true. It is the first thing people read about you.",
  fields: [
    { name: "energy", label: "Your default mode", type: "energy" },
    {
      name: "working_style",
      label: "And a few habits",
      type: "chips",
      optional: true,
      suggestions: STYLE_SUGGESTIONS,
    },
  ],
};

const EXCHANGE_STEP: OnboardingStep = {
  id: "exchange",
  title: "The trade",
  caption: "This is what the directory and the assistant search. Be specific — “sales” helps nobody.",
  fields: [
    {
      name: "ask_me_about",
      label: "Ask me about",
      type: "chips",
      hint: "Things you could actually talk someone through for 20 minutes.",
      suggestions: ASK_SUGGESTIONS,
    },
    {
      name: "need_help_with",
      label: "I need help with",
      type: "chips",
      hint: "Saying this out loud is how you get it.",
      suggestions: HELP_SUGGESTIONS,
    },
  ],
};

const VOICE_STEP: OnboardingStep = {
  id: "voice",
  title: "In your words",
  fields: [
    {
      name: "headline",
      label: "One line about you",
      type: "text",
      maxLength: 90,
      placeholder: "Building a better way to sell used textbooks",
    },
    {
      name: "superpower",
      label: "Unreasonably good at",
      type: "text",
      maxLength: 160,
      placeholder: "Getting strangers to answer the phone",
    },
    {
      name: "fun_fact",
      label: "One thing people would not guess",
      type: "text",
      maxLength: 160,
      optional: true,
    },
  ],
};

/* ----------------------------------------------------------- new member */

const NEW_WORK_STEP: OnboardingStep = {
  id: "work",
  title: "What are you on right now?",
  caption: "No venture yet is a real answer. Half the cohort is there on day one.",
  fields: [
    {
      name: "currently",
      label: "What you are working on",
      type: "textarea",
      maxLength: 240,
      placeholder:
        "Nothing yet — I care about how hard it is to find a sublet, and I want to dig into it.",
      hint: "A problem you care about counts. So does “I have no idea yet.”",
    },
    {
      name: "origin",
      label: "Why that, and why you",
      type: "textarea",
      maxLength: 400,
      optional: true,
      placeholder: "I moved three times in two years and every single time was miserable.",
    },
  ],
};

/* -------------------------------------------------------- current member */

const CURRENT_WORK_STEP: OnboardingStep = {
  id: "work",
  title: "What are you building?",
  fields: [
    {
      name: "currently",
      label: "What you are working on",
      type: "textarea",
      maxLength: 240,
      placeholder: "Athena — matching student founders with operator mentors.",
    },
    {
      name: "origin",
      label: "How you got here",
      type: "textarea",
      maxLength: 400,
      optional: true,
      hint: "New members read this to decide who to go talk to.",
    },
  ],
};

/* ------------------------------------------------------------------ flows */

const NEW_MEMBER_FLOW: OnboardingStep[] = [
  TRACK_STEP,
  IDENTITY_STEP,
  NEW_WORK_STEP,
  ENERGY_STEP,
  EXCHANGE_STEP,
  VOICE_STEP,
];

const CURRENT_MEMBER_FLOW: OnboardingStep[] = [
  TRACK_STEP,
  IDENTITY_STEP,
  CURRENT_WORK_STEP,
  ENERGY_STEP,
  {
    ...EXCHANGE_STEP,
    caption:
      "New members will search this to find you. What you list is what they will ask you for.",
    fields: [
      {
        ...EXCHANGE_STEP.fields[0],
        label: "New members should ask me about",
      },
      {
        ...EXCHANGE_STEP.fields[1],
        label: "I could still use help with",
        hint: "You are not done learning either. Say it.",
        optional: true,
      },
    ],
  },
  VOICE_STEP,
];

export function stepsFor(track: MemberTrack | null): OnboardingStep[] {
  if (track === "current") return CURRENT_MEMBER_FLOW;
  if (track === "new") return NEW_MEMBER_FLOW;
  return [TRACK_STEP];
}

export const ENERGY_OPTIONS = ENERGY_ORDER.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
  detail: ENERGY_LABEL[value],
}));

/** Fields the wizard is allowed to write. Nothing else reaches the update. */
export const ONBOARDING_FIELDS = [
  "member_track",
  "full_name",
  "pronouns",
  "major",
  "grad_year",
  "hometown",
  "currently",
  "origin",
  "energy",
  "working_style",
  "ask_me_about",
  "need_help_with",
  "headline",
  "superpower",
  "fun_fact",
] as const;

export type OnboardingField_ = (typeof ONBOARDING_FIELDS)[number];
