/**
 * Domain shapes. Hand-written rather than generated: the schema is stable and
 * checked into this repo, and a generation step in CI is one more thing to keep
 * running for 50 users.
 */

export type Role = "admin" | "current_member" | "new_member";
export type MemberTrack = "new" | "current";

export type Energy =
  | "builder"
  | "operator"
  | "seller"
  | "storyteller"
  | "researcher"
  | "connector"
  | "designer";

/** The one-line read on how someone operates. Shown under their name. */
export const ENERGY_LABEL: Record<Energy, string> = {
  builder: "Builds first, explains later",
  operator: "Makes the machine run",
  seller: "Can get a stranger to say yes",
  storyteller: "Makes people believe it",
  researcher: "Reads the thing everyone else skipped",
  connector: "Knows who you need to talk to",
  designer: "Cares how it feels to use",
};

export const ENERGY_ORDER: Energy[] = [
  "builder",
  "operator",
  "seller",
  "storyteller",
  "researcher",
  "connector",
  "designer",
];

export type Profile = {
  id: string;
  slug: string | null;
  email: string;
  full_name: string | null;
  role: Role;
  member_track: MemberTrack | null;
  major: string | null;
  grad_year: number | null;
  pronouns: string | null;
  hometown: string | null;
  headline: string | null;
  currently: string | null;
  superpower: string | null;
  origin: string | null;
  fun_fact: string | null;
  ask_me_about: string[];
  need_help_with: string[];
  working_style: string[];
  energy: Energy | null;
  skills: string[];
  interests: string[];
  bio: string | null;
  linkedin_url: string | null;
  resume_path: string | null;
  avatar_path: string | null;
  big_id: string | null;
  is_active: boolean;
  onboarded_at: string | null;
  created_at: string;
};

export type CompanyStatus = "active" | "pivoted" | "killed";

export type Company = {
  id: string;
  slug: string;
  name: string;
  one_liner: string;
  status: CompanyStatus;
  investable: boolean;
  logo_path: string | null;
  deck_path: string | null;
  demo_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type CompanyTotals = {
  company_id: string;
  raised: number;
  backer_count: number;
};

export type PostKind =
  | "announcement"
  | "alert"
  | "assignment"
  | "form"
  | "sprint"
  | "session"
  | "update";

/** Feed vocabulary. Short label, because the feed is the least wordy screen. */
export const POST_KIND_LABEL: Record<PostKind, string> = {
  announcement: "Announcement",
  alert: "Alert",
  assignment: "Homework",
  form: "Form",
  sprint: "Money Sprint",
  session: "Session",
  update: "Update",
};

export type Audience = "all" | "new_member" | "current_member";

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Everyone",
  new_member: "New members",
  current_member: "Current members",
};

export type Post = {
  id: string;
  author_id: string;
  company_id: string | null;
  title: string;
  body: string;
  kind: PostKind;
  audience: Audience;
  pinned: boolean;
  cta_label: string | null;
  cta_href: string | null;
  event_at: string | null;
  location: string | null;
  assignment_id: string | null;
  published_at: string;
};

export type InvestmentStatus = "pending" | "accepted" | "declined";

export type Investment = {
  id: string;
  investor_id: string;
  company_id: string;
  amount: number;
  note: string;
  commitment_types: string[];
  status: InvestmentStatus;
  created_at: string;
  responded_at: string | null;
};

export type Assignment = {
  id: string;
  week_number: number | null;
  title: string;
  detail: string | null;
  audience: Audience;
  due_at: string | null;
  submit_kind: "text" | "link" | "file" | "external" | "none";
  submit_href: string | null;
  submit_hint: string | null;
  is_published: boolean;
  created_at: string;
};

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  profile_id: string;
  body: string | null;
  url: string | null;
  file_path: string | null;
  status: "submitted" | "approved" | "returned";
  feedback: string | null;
  submitted_at: string;
};

export type TodoUrgency = "overdue" | "now" | "soon" | "later";

export type Todo = {
  key: string;
  kind: "assignment" | "investment" | "application" | "sprint" | "profile";
  title: string;
  detail: string | null;
  due_at: string | null;
  href: string;
  cta: string;
  urgency: TodoUrgency;
};

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  description: string | null;
  week_number: number | null;
};

export type SprintEvent = {
  id: string;
  name: string;
  status: "draft" | "open" | "closed";
  multiplier: number;
  started_at: string | null;
  ended_at: string | null;
};

export type SprintRow = {
  event_id: string;
  profile_id: string;
  full_name: string | null;
  avatar_path: string | null;
  team: "wyatt" | "madison" | null;
  delivered: number;
  pre_service: number;
  score: number;
};

export type AppSettings = {
  id: number;
  investment_window_open: boolean;
  investment_opens_at: string | null;
  investment_closes_at: string | null;
  investment_min: number;
  investment_max: number;
  investor_budget: number;
};

export type AllowedEmail = {
  email: string;
  role: Role;
  full_name: string | null;
  note: string | null;
  claimed_at: string | null;
  created_at: string;
};

/** Flattened member row the chatbot retrieves over. Never carries Section 2. */
export type MemberCard = {
  id: string;
  slug: string | null;
  full_name: string | null;
  role: Role;
  member_track: MemberTrack | null;
  major: string | null;
  grad_year: number | null;
  headline: string | null;
  currently: string | null;
  superpower: string | null;
  energy: Energy | null;
  ask_me_about: string[];
  need_help_with: string[];
  skills: string[];
  interests: string[];
  working_style: string[];
  hometown: string | null;
  companies: string[];
  company_summary: string;
};
