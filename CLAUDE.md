# CLAUDE.md — SEPi NME Platform

Read [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md) before writing code. It is the authority on scope.
This file is the short version of how to work in this repo.

## What exists

Migrations, brand tokens, and specs. **No application code yet.** If `package.json` does not
exist, you are at step 1 of the build order.

## Non-negotiables

These are the things that will actually break this app if you get them wrong.

1. **Never store a balance column.** Balance is `available_balance(uuid)`. Do not recompute it in
   TypeScript, do not cache it in a table, do not add one "for performance." 50 users.

2. **Investment rules live in Postgres, not React.** `place_investment()` enforces all seven.
   Client validation is for feedback only. If you find yourself writing a budget check in a server
   action, the check belongs in the function.

3. **The service role key never reaches the browser.** It is used in server actions and route
   handlers only. `NEXT_PUBLIC_` prefixed variables are public — the service key must never carry
   that prefix.

4. **Section 2 of the application is private.** Read public application answers from the
   `application_public` view. Never `select * from applications` on a page any member can see.

5. **File bytes never pass through a Vercel function.** Uploads go browser → Supabase Storage
   directly, using the session token. Route handlers may mint signed URLs; they may not proxy
   files.

6. **375px is the floor, not an afterthought.** Write the mobile layout first. Every interactive
   element is at least 44px. Zero hover-dependent interactions.

7. **Email never blocks an action.** Every `sendEmail()` call is inside try/catch. An investment
   succeeds whether or not Resend is reachable.

8. **Admin server actions re-verify role server-side** against the database, every time, even
   though middleware and RLS already checked. Three layers, all three real.

## Conventions

- Server Components by default. `"use client"` only where interactivity requires it.
- Mutations are Server Actions, not route handlers, unless there is a webhook or cron reason.
- Zod schema per form, shared between client validation and the server action.
- Money is stored and passed as integer dollars. No cents, no floats, no `Decimal`.
- Timestamps: always `timestamptz`, always let Postgres set them with `default now()`.
- Question wording lives in `lib/application-questions.ts`. Changing a question is a TypeScript
  edit, never a migration.
- Slugs are generated once at company creation and never change — they are in URLs and
  notification links.

## Design

Tokens in [design/tokens.css](design/tokens.css), palette rationale in [docs/BRAND.md](docs/BRAND.md).

Fraunces 600 for headlines only — never paragraph text. Karla for everything else. Density over
whitespace. No gradients, no hero sections, no illustrations, no marketing copy. If a screen
looks like a startup landing page, it is wrong.

The admin console is deliberately unstyled: sidebar, dense tables, no brand treatment. It is a
control panel.

## Adding dependencies

The approved list is in the spec. Anything else needs a stated reason before it goes in
`package.json`. Reach for a Postgres function or 30 lines of TypeScript before a package.
