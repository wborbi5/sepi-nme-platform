# Handoff prompt

Paste this into a fresh Claude session that has the repo open. It assumes nothing from prior
conversations.

Run it in stages — the "STOP" markers are deliberate. A single session that tries to build all
thirteen steps will lose the thread somewhere around step 7.

---

## Stage 1 — scaffold and auth

```
You are building the SEPi NME Platform, an internal web app for Sigma Eta Pi's New Member
Education program at Miami University. ~50 users, invite-only, fully auth-walled, no public pages.

Read these first, in this order:
  CLAUDE.md                  — non-negotiables and conventions
  docs/BUILD_SPEC.md         — the full specification, this is the authority on scope
  docs/BRAND.md              — palette and typography
  supabase/migrations/       — the schema, RLS, and business logic are already written

The migrations are done and assumed to be already applied to a live Supabase project. Do not
rewrite them. If you believe one is wrong, say so and stop — do not silently change the schema.

Your job in this session is BUILD ORDER STEPS 2 AND 3 ONLY:

  Step 2 — Auth: invite-only, magic link, middleware, session helpers
  Step 3 — Profiles: view, edit, avatar upload, big/little display

Start by scaffolding the Next.js 15 app in place at the repo root:
  - TypeScript, App Router, Tailwind, src/ directory: no, import alias @/*
  - Add only: @supabase/supabase-js, @supabase/ssr, react-hook-form, zod,
    @hookform/resolvers, react-markdown. Nothing else without telling me why.
  - Wire design/tokens.css into app/globals.css and load Fraunces 600 + Karla via
    next/font/google. See design/tailwind-theme.md.
  - shadcn/ui init, pointed at the semantic tokens, small radii (2-4px).

Then build auth:
  - Server and browser Supabase clients using @supabase/ssr
  - middleware.ts: any unauthenticated request redirects to /login. /admin/* additionally
    requires role = 'admin', read from the database, not a cookie.
  - /login: email input, magic link only, no password field, no signup link
  - The admin invite server action: supabase.auth.admin.inviteUserByEmail(), service role key
    server-side only, reject any address not ending in @miamioh.edu, pass role and full_name as
    invite metadata so the profile trigger picks them up

Then profiles:
  - /p/[slug] — name, avatar, small text role label, major, grad year, skills and interests as
    chips, bio, LinkedIn, resume link, big/little as a link to the other profile, companies
    they're in. Edit button only on your own.
  - Profile edit form: react-hook-form + zod, one shared schema between client and server action
  - The avatar uploader, built to the mobile spec in BUILD_SPEC.md § MOBILE AND UPLOADS. This
    component gets reused for logos and sprint proof photos, so build it properly once:
    camera capture on mobile, client-side resize to 1200px WebP q0.85, browser-direct upload to
    Supabase Storage, real percentage progress, local preview before upload completes, retry
    without losing the file. File bytes must never pass through a Vercel function.

Write the 375px layout first. Desktop is the enhancement, not the other way around.

STOP after step 3. Show me what you built and let me look at it before you continue.
```

---

## Stage 2 — admin, companies, application

```
Continue the SEPi NME Platform. Re-read CLAUDE.md and docs/BUILD_SPEC.md.

Build order steps 4, 5, and 6:

  Step 4 — Admin console: members section. Separate layout with a left sidebar, dense tables,
           no brand styling. Single and bulk invite (newline-separated emails, one role for the
           batch, one action). Assign role, set big/little, deactivate.
           Every admin server action re-verifies role server-side against the database before
           any write, even though middleware and RLS already check. Three layers, all three real.

  Step 5 — Companies: create, edit, logo upload (reuse the uploader from step 3), and the
           company page at /c/[slug]. Follow the layout in BUILD_SPEC.md exactly — backers
           section placed HIGH, raise bar, 60-second readability. Non-investable companies show
           the same page minus raise bar, invest button, and backers.
           Read public application answers from the application_public view. Never select from
           the applications table on a page any member can see.

  Step 6 — Accelerator Application at /apply/[companyId]. Three passes, separate rows, never
           overwritten. Question definitions in lib/application-questions.ts — the Section 3 keys
           must be exactly: revenue_model, target_audience, competitive_advantage, timing,
           customer_acquisition, milestones, because application_public reads those keys.
           400-char caps with live counters on Section 3. Autosave drafts to application_drafts,
           debounced ~2s, keep the local copy until the server confirms.
           Build the "No venture yet" escape hatch for Pass 1 — it captures problem interest and
           skills only, creates a placeholder company, and unlocks the full form at Pass 2.

STOP after step 6.
```

---

## Stage 3 — directory, dashboard, sprint

```
Continue the SEPi NME Platform. Re-read CLAUDE.md and docs/BUILD_SPEC.md.

Build order steps 7, 8, and 9:

  Step 7 — /directory. Model it on the Y Combinator company directory and nothing else. One line
           per company. No cards. No images in the list. No whitespace padding. Filter chips for
           status, investable, has-application. Search by name or one-liner. 15 companies visible
           without scrolling on desktop. On mobile it is a scrollable list, never a horizontally
           scrolling table. Use the company_totals view for raised and backer count.

  Step 8 — /calendar and the dashboard at /. Dashboard: next session at top, directory preview
           (top 5 by raised), leaderboard sidebar, thin activity ticker, your balance if you can
           invest.

  Step 9 — /sprint. Only renders when a sprint event exists. Use the sprint_leaderboard view.
           Show raw delivered, raw pre-service, and the computed score side by side. Team totals
           for Wyatt vs Madison. Submission form when the event is open, with proof photo upload.
           Entries show pending until an admin approves; only approved entries score.
           Admin sprint section: create event, start, approve/reject with a reason, assign teams,
           close.

STOP after step 9.
```

---

## Stage 4 — the investment portal

```
Continue the SEPi NME Platform. Re-read CLAUDE.md and docs/BUILD_SPEC.md § INVESTMENT RULES.

Build order step 10, the investment portal. This is the part that matters most — on Nov 2, 50
people use it on phones in a loud room to decide where money goes.

All seven investment rules are already enforced in place_investment() in
supabase/migrations/0002_functions.sql. Call the function. Do not reimplement the rules in
TypeScript. Client-side validation is for instant feedback only, and it must agree with the
function rather than replace it.

Build:
  - The invest flow as a BOTTOM SHEET on mobile, not a centered modal. Amount field with
    inputMode="numeric". The note field is required and the UI must make clear that the note
    publishes on the company page — it is the pitch feedback mechanism, not a formality.
  - Optional resource attachment: link, mentor intro, suggestion. Calls
    attach_investment_resource().
  - Founder accept/decline, calling respond_to_investment(). Show the 72-hour deadline as a
    countdown, not a timestamp.
  - /portfolio: your investments, amounts, statuses, remaining balance. Balance prominent.
  - Balance pinned in a sticky header while the window is open. Read it from
    available_balance(). There is no balance column and you must not add one.
  - Admin investments section: full ledger, all balances, force-resolve pendings, void.

Investors can never withdraw or reverse. There must be no code path that lets them.

Then verify against the rules by actually exercising them, not by reading the code:
  1. amount below 10000 and above 100000 both rejected
  2. an investor at 200000 committed cannot commit more
  3. you cannot invest in a company you are a member of
  4. a non-investable company shows no invest button and rejects a direct call
  5. everything rejects when the window is closed
  6. a second investment in the same company is rejected
  7. a new_member cannot invest at all

STOP after step 10.
```

---

## Stage 5 — notifications, email, feed, mobile pass

```
Continue the SEPi NME Platform. Re-read CLAUDE.md and docs/BUILD_SPEC.md.

Build order steps 11, 12, and 13:

  Step 11a — In-app notifications FIRST. Bell in nav, unread count, dropdown, mark as read.
             The notify() Postgres function already writes the rows; you are building the UI and
             the mark-read action.

  Step 11b — Email, on top of in-app. Resend + React Email.
             One server-side sendEmail() helper. No Resend calls anywhere else in the codebase.
             Every send writes to email_log before and after, with the Resend ID.
             Every send sets a dedupe_key — reminders use reminder:{investment_id} — so a cron
             retry hits the unique constraint and no-ops.
             Check profiles.email_prefs first; write a 'skipped' row if opted out.
             Wrap every send in try/catch. An email failure must never block the action that
             triggered it.
             Send only: investment received (with the 72h deadline), 24h-remaining reminder,
             investment declined, sprint entry rejected with reason, and the Monday 7am ET
             weekly digest. Never email on accept, new posts, sprint approvals, or general
             activity.
             Cron routes under app/api/cron/, guarded by the CRON_SECRET header, registered in
             vercel.json.
             One React Email template reused across all types, brand colors, the eagle PNG (not
             SVG), plain text fallback for each. It must render correctly in Gmail on a phone —
             tables and inline styles, no flexbox.
             /settings/notifications: toggle per email type, linked from every email footer.
             Admin email section: delivery status from email_log.

  Step 12 — /updates. Posts and investment events merged by timestamp. Posts render full with
            markdown. Investment events are a single line: "X backed Y for $Z" plus the note.
            Money Sprint does not appear here.

  Step 13 — Mobile pass across every page at 375px. Bottom tab bar: Home, Directory, Updates,
            Profile. Verify 44px minimum touch targets everywhere. Remove any hover-dependent
            interaction you find. Then walk every page at 375px and fix what breaks.
```

---

## If a session goes sideways

Reset with:

```
Stop. Re-read CLAUDE.md, then tell me — without changing any files — which of the eight
non-negotiables the current code violates, and where.
```
