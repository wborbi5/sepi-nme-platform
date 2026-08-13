# CLAUDE.md — SEPi NME Platform

Read [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md) before writing code. It is the authority on scope.
This file is the short version of how to work in this repo.

## What exists

The full application. Next.js 15 App Router, Supabase, Tailwind v4, deployed on Vercel.
Migrations 0001–0006, the member app under `app/(app)/`, the admin console under `app/admin/`,
and every mutation as a server action in `app/actions/`.

## Non-negotiables

These are the things that will actually break this app if you get them wrong.

1. **Never store a balance column.** Balance is `available_balance(uuid)`. Do not recompute it in
   TypeScript, do not cache it in a table, do not add one "for performance." 50 users.

2. **Investment rules live in Postgres, not React.** `place_investment()` enforces all seven.
   Client validation is for feedback only. If you find yourself writing a budget check in a server
   action, the check belongs in the function.

3. **The service role key never reaches the browser.** It is used in server actions and route
   handlers only. `lib/supabase/admin.ts` is marked `server-only`, which makes a client import a
   build error rather than a leak. `NEXT_PUBLIC_` prefixed variables are public — the service key
   must never carry that prefix.

4. **Section 2 of the application is private.** Read public application answers from the
   `application_public` view. Never `select * from applications` on a page any member can see.
   The same rule governs `member_card`, which is what the assistant retrieves over — nothing
   private may be added to that view.

5. **File bytes never pass through a Vercel function.** Uploads go browser → Supabase Storage
   directly, using the session token. `components/image-upload.tsx` uses XHR for real upload
   progress. Route handlers may mint signed URLs; they may not proxy files.

6. **375px is the floor, not an afterthought.** Write the mobile layout first. Every interactive
   element is at least 44px (`--tap-min`). Zero hover-dependent interactions.

7. **Email never blocks an action.** `sendEmail()` in `lib/email.ts` never throws, and every call
   site is inside try/catch anyway. An investment succeeds whether or not Resend is reachable.
   Idempotency is `email_log.dedupe_key`, which is unique — a cron retry no-ops on the constraint.

8. **Admin server actions re-verify role server-side** against the database, every time, even
   though middleware and RLS already checked. `assertAdmin()` is the first line of every action in
   `app/actions/admin.ts`. Three layers, all three real.

9. **The allowlist is the only door.** `allowed_emails` is checked twice: once in the login action
   with the service role, and again in `handle_new_auth_user()`, which raises for an unlisted
   email and thereby aborts the `auth.users` insert. Role comes from the allowlist row, never from
   signup metadata. Do not add a signup path that skips either check.

## Conventions

- Server Components by default. `"use client"` only where interactivity requires it.
- Mutations are Server Actions, not route handlers, unless there is a webhook or cron reason.
- Zod schema per action, on the server, whitelisting fields. Never spread user input into an
  `update()`.
- Money is stored and passed as integer dollars. No cents, no floats, no `Decimal`.
- Timestamps: always `timestamptz`, always let Postgres set them with `default now()`.
- Question wording lives in `lib/application-questions.ts` and `lib/onboarding.ts`. Changing a
  question is a TypeScript edit, never a migration.
- Slugs are generated once at creation and never change — they are in URLs and notification links.
  Profiles get theirs from the `profiles_slug_guard` trigger, companies from `createCompany()`.
- To-dos are never stored. `todos_for(uuid)` computes them from current state; storing one would
  mean keeping it in sync with five other tables.

## Design

Tokens in [design/tokens.css](design/tokens.css), palette rationale in [docs/BRAND.md](docs/BRAND.md).

**The app is dark.** The brand guide specifies a light system; this app inverts the ground and
keeps everything else. Midnight — the guide's own "dark backgrounds" color — becomes the page,
and the guide's white-mark-on-dark rule applies everywhere. Four brand colors are unusable on a
near-black ground and have documented dark-surface tints (`--navy-lift`, `--oxford-lift`,
`--cobalt-lift`, plus the three status colors). The published hexes still govern anything that
leaves the screen — email templates use the light system on purpose.

Fraunces 600 for headlines and numbers only — never paragraph text. Karla for everything else.
Density over whitespace. No gradients, no hero sections, no illustrations, no marketing copy. The
loudest thing on any screen should be a concrete figure in Cloud White, not a decoration. If a
screen looks like a startup landing page, it is wrong.

Chrome is a three-bar menu on the left and the profile circle on the right. Nothing else lives in
the top bar.

The admin console is deliberately unstyled: sidebar, dense tables, no brand treatment. It is a
control panel and should not be mistaken for the member app.

## Adding dependencies

The approved list is in the spec. Anything else needs a stated reason before it goes in
`package.json`. Reach for a Postgres function or 30 lines of TypeScript before a package —
`lib/cn.ts` replaced `clsx` + `tailwind-merge`, and `unaccent_lite()` replaced a Postgres
extension. The one addition beyond the spec is `@anthropic-ai/sdk`, for the member assistant;
it is optional at runtime and the feature degrades to `lib/member-search.ts` without a key.
