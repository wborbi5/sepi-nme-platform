# SEPi NME Platform

Internal web application for **Sigma Eta Pi**'s New Member Education program at Miami University.

~50 users. Invite-only, fully auth-walled, no public pages.

## What this repo is right now

The application is built. Next.js 15 App Router, Supabase, deployed on Vercel.

| Path | What's in it |
|---|---|
| `app/(app)/` | The member-facing app — feed, members, profiles, ask, companies, sprint, portfolio, to-do |
| `app/admin/` | The admin console — deliberately unstyled control panel |
| `app/actions/` | Server actions. Every mutation goes through one of these |
| `lib/` | Supabase clients, auth guards, domain types, question config, ranking, email |
| [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md) | The build specification — stack, roles, data model, rules, pages |
| [docs/BRAND.md](docs/BRAND.md) | Palette and typography from the SEPi Brand Guide v2.0, plus the dark treatment |
| [docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md) | Everything a human has to do by hand (Supabase, Resend, DNS, Vercel) |
| [supabase/migrations/](supabase/migrations/) | Full schema, RLS policies, Postgres functions, storage buckets |
| [design/tokens.css](design/tokens.css) | Brand tokens as CSS custom properties |

## Stack

Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, Storage) · Tailwind v4 ·
Zod · react-markdown · Resend · Anthropic SDK · Vercel

No other dependencies without a stated reason. Two notes on the list above:

- **`@anthropic-ai/sdk`** powers the member assistant at `/ask`. Without a key it falls back to
  deterministic ranking in `lib/member-search.ts`, so the feature degrades to a good search box
  rather than an error page.
- **shadcn/ui is not installed.** The dark treatment needed a small hand-written kit
  (`components/ui.tsx`) rather than a generated neutral scale. `clsx` and `tailwind-merge` were
  likewise replaced by 20 lines in `lib/cn.ts`.

## How someone gets in

There is exactly one door, and it is the `allowed_emails` table.

1. An admin pastes emails at `/admin/members`, picks a role, and saves.
2. That person enters their email at `/login`. Magic link, no passwords.
3. `handle_new_auth_user()` checks the allowlist again in Postgres and **raises** if the email is
   not on it — which aborts the `auth.users` insert. An account is never created.
4. First time in, middleware routes them to `/onboarding`. Every time after, straight inside.

The role comes from the allowlist row, never from the signup payload.

## Key dates

- **Oct 12 2026** — Week 1
- **Nov 2 2026** — investment window opens; 50 people using this on phones in a loud room
- **Nov 23 2026** — Week 7, investment window closes
- **Dec 4 2026** — Athena 42

Mobile-first is the highest-priority non-functional requirement. 375px is the floor.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev
```

1. Work through [docs/SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md) to stand up Supabase.
2. Run the migrations in `supabase/migrations/` in numeric order (0001 → 0006).
3. Add yourself to `allowed_emails` with `role = 'admin'` — by hand, in the SQL editor, once.
   Everyone else you can add from the admin console.

```sql
insert into allowed_emails (email, role, full_name)
values ('you@miamioh.edu', 'admin', 'Your Name');
```

## Checks

```bash
npm run typecheck
npm run build
```
