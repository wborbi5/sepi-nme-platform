# SEPi NME Platform

Internal web application for **Sigma Eta Pi**'s New Member Education program at Miami University.

~50 users. Invite-only, fully auth-walled, no public pages.

## What this repo is right now

This is the **specification and infrastructure foundation**. The application code has not been
written yet — it is meant to be built from [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md) by an agent
or developer picking this up.

| Path | What's in it |
|---|---|
| [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md) | The complete build specification — stack, roles, data model, rules, pages, design direction |
| [docs/BRAND.md](docs/BRAND.md) | Palette and typography extracted from the SEPi Brand Guide v1.0 |
| [docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md) | Everything a human has to do by hand (Supabase, Resend, DNS, Vercel) |
| [docs/HANDOFF_PROMPT.md](docs/HANDOFF_PROMPT.md) | Copy-paste prompt to hand this repo to a coding agent |
| [supabase/migrations/](supabase/migrations/) | Full schema, RLS policies, Postgres functions, storage buckets |
| [design/tokens.css](design/tokens.css) | Brand tokens as CSS custom properties, ready to drop into `globals.css` |

## Stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, Storage) · Tailwind + shadcn/ui ·
react-hook-form + Zod · react-markdown · Resend + React Email · Vercel

No other dependencies without a stated reason.

## Key dates

- **Nov 2 2026** — investment window opens; 50 people using this on phones in a loud room
- **Nov 23 2026** — investment window closes

Mobile-first is the highest-priority non-functional requirement. 375px is the floor.

## Getting started

1. Work through [docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md) to stand up Supabase.
2. Run the migrations in `supabase/migrations/` in numeric order.
3. Follow the build order at the bottom of [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md).
