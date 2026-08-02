# SEPi NME Platform — Build Specification

Internal web application for Sigma Eta Pi's New Member Education program at Miami University.
Roughly 50 users. Invite-only, fully auth-walled, no public pages.

---

## BRAND — resolved

Pulled from SEPi Brand Guide v1.0. Full palette in [BRAND.md](BRAND.md), tokens ready to use in
[../design/tokens.css](../design/tokens.css).

```
Primary color (Executive Navy):  #1F3A5F
Secondary (Midnight):            #101828
Accent (Cobalt):                 #1B2A8C
Background (Cloud White):        #F8FAFC
Surface (Pure White):            #FFFFFF
Text primary / secondary:        #101828 / #6B7280
Border (Cool Gray):              #D1D5DB
Success / warning / danger:      #15803D / #B45309 / #B91C1C
Headline font:  Fraunces, weight 600
Body font:      Karla
Logo file:      public/logo/eagle-navy.svg   (see BRAND.md — needs exporting)
```

Buttons and links use Oxford Blue `#2C4A73`. Cobalt is reserved for CTAs and hover states —
the Invest button, primarily. Status colors are not in the brand guide; they are additions.

---

## STACK

- Next.js 15, App Router, TypeScript
- Supabase: Postgres, Auth, Storage
- Tailwind CSS + shadcn/ui
- react-hook-form + Zod for all forms
- react-markdown for post rendering
- Resend + React Email for transactional mail
- Deployed on Vercel

**Do not add any other dependencies without flagging why.**

---

## ROLES

| Role | Description |
|---|---|
| `admin` | Full control. One or two people. |
| `current_member` | Founding class. Holds a $200,000 fake investment budget. Can create a company, but their companies are **not** investable. |
| `new_member` | The NME cohort. Creates a company, fills the Accelerator Application, receives investment. No investment budget. |

Role is set by admin at invite time and can be changed by admin. It appears on the profile as a
small text label — not a badge, not a banner.

---

## AUTH

- Public signup **disabled entirely**
- Admin invites via `supabase.auth.admin.inviteUserByEmail()`, server-side only. The service role
  key never reaches the browser.
- Restrict to `@miamioh.edu`, validated server-side in the invite action
- Magic link only, no passwords
- Invite token expiry: 7 days
- Bulk invite: paste newline-separated emails, pick a role, send in one action
- Postgres trigger auto-creates the `profiles` row on new auth user, pre-filled with role and name
  from invite metadata (`handle_new_auth_user()` in `0002_functions.sql`)
- Middleware redirects any unauthenticated request to `/login`

---

## DATA MODEL

Authoritative version is [`supabase/migrations/0001_schema.sql`](../supabase/migrations/0001_schema.sql).
Tables: `profiles`, `companies`, `company_members`, `applications`, `application_drafts`,
`investments`, `investment_resources`, `notifications`, `sprint_events`, `sprint_entries`, `posts`,
`cal_events`, `attendance` (stub, no UI), `app_settings`, `email_log`.

**Never store a balance column.** Available balance is always computed:

```
200000 - SUM(amount) WHERE investor_id = me AND status IN ('pending','accepted')
```

`available_balance(uuid)` and `committed_total(uuid)` in `0002_functions.sql` are the only
correct sources. Do not recompute this in TypeScript.

---

## INVESTMENT RULES

All of these are enforced inside `place_investment()`, a Postgres function wrapped in a
transaction. **None of them live in React.** React may mirror them for input validation and
instant feedback, but the database is the authority.

1. Amount between $10,000 and $100,000
2. Investor's committed total cannot exceed $200,000
3. Cannot invest in a company you are a member of
4. Target company must have `investable = true`
5. Investment window must be open
6. One investment per investor per company (unique constraint)
7. Only `current_member` and `admin` roles can invest

**Flow**

- Investor commits. Status `pending`. Funds lock immediately against their balance.
- Founder receives a notification and can accept or decline.
- Accept sets status `accepted`. Permanent, appears publicly.
- Decline sets status `declined`. Funds return to the investor's available balance.
- **Auto-accept after 72 hours** if the founder has not responded. `auto_accept_stale_investments()`
  runs hourly via pg_cron (`0005_cron.sql`).
- Investors can **never** withdraw or reverse an investment themselves.

The `note` field is **required**. To invest, you must write why. This doubles as the pitch
feedback mechanism and displays publicly on the company page.

Investors can attach resources to their investment — links, mentor intros, suggestions. Each
creates a notification to the founder. `attach_investment_resource()`.

Window opens **Nov 2 2026**, closes **Nov 23 2026**, both controlled by admin in `app_settings`.
The dates are seeded; the `investment_window_open` boolean is the actual gate and defaults to
`false`.

---

## PAGES

```
/login                    magic link entry
/                         dashboard
/directory                company list
/c/[slug]                 company page
/p/[slug]                 member profile
/updates                  posts + investment activity feed
/sprint                   Money Sprint leaderboard
/calendar                 event schedule
/portfolio                your investments and balance
/apply/[companyId]        accelerator application
/settings/notifications   email preferences
/admin/*                  admin console
```

### Dashboard `/`
Next upcoming session at top. Directory preview (top 5 by raised). Leaderboard sidebar. Thin
activity ticker. Your balance if you're an investor.

### Directory `/directory`
**Model this on the Y Combinator company directory.** One line per company. No cards, no images
in the list, no whitespace padding. Filter chips across the top: status, investable,
has-application. Search by name or one-liner. Target 15 companies visible without scrolling on
desktop.

Each row: name, one-liner, status tag, total raised, backer count.

### Company page `/c/[slug]`

Above the fold:
- Name, 50-char one-liner, status tag
- Founder avatars linking to profiles
- Raise bar (horizontal, filled to percentage of top-raised company), total raised, backer count
- Invest button (only if `investable`, window open, viewer eligible)

Body — six blocks from the current Accelerator Application pass, each capped at 400 characters:
revenue model, target audience, competitive advantage, timing, customer acquisition, milestones.
Read these from the `application_public` view, never from the `applications` table directly —
Section 2 is private and must not leave the database.

Then:
- Assets strip: deck, demo, website
- **Backers section, placed high.** Each investor, amount, and their required note. This is the
  most valuable content on the page. Do not bury it.
- Company updates, reverse chronological

Non-investable companies (current-member companies) show the same page minus the raise bar,
invest button, and backers section.

Whole page must be readable in under 60 seconds.

### Profile `/p/[slug]`
Name, avatar, small role label, major, grad year, skills (chips), interests (chips), bio,
LinkedIn, resume link. Big/little shown as a link to the other profile. Companies they're part
of. If viewing your own: edit button. If investor: portfolio summary.

### Updates `/updates`
Two streams merged by timestamp:
- **Posts** — founder-written, full entry, markdown rendered
- **Investment events** — single line, "X backed Y for $Z" plus the note

Money Sprint does **not** appear here.

### Sprint `/sprint`
Only visible when a sprint event exists. Leaderboard ranked by
`amount_delivered + (amount_pre_service * 1.5)`. Shows both raw components and the computed
score. Team totals for Wyatt vs Madison. Submission form when the event is `open`, with proof
photo upload. Submissions show as pending until admin approves. Only approved entries count
toward the board. Use the `sprint_leaderboard` view.

### Portfolio `/portfolio`
Your investments, amounts, statuses, remaining balance. Prominent.

---

## ADMIN CONSOLE

Separate layout: left sidebar, not the top nav. Dense tables. No brand styling, no polish. This
is a control panel.

- **Members** — invite (single and bulk), assign role, set big/little, deactivate
- **Companies** — toggle `investable`, set status, edit, archive
- **Investments** — full ledger, all balances, force-resolve pendings, void
- **Sprint** — create event, start, review and approve/reject submissions, assign teams, close
- **Calendar** — CRUD on events
- **Applications** — read every submission, all passes, side by side
- **Email** — delivery status from `email_log`
- **Settings** — open/close investment window, adjust caps and dates

Admin can do everything any user can do, on anyone's behalf.

**Three layers of admin protection:**
1. Middleware blocks `/admin/*` for non-admins
2. RLS policies check role on every privileged table operation
3. Server actions re-verify session role server-side before any write

Layer 3 is not optional even though layers 1 and 2 exist. Every admin server action starts by
reading the session and confirming `role = 'admin'` against the database, not against a cookie
or a client-supplied value.

---

## ACCELERATOR APPLICATION

Three passes per company, stored as separate rows, never overwritten. Pass 1 in Week 1, Pass 2 in
Week 4, Pass 3 in Week 7.

Answers stored as JSONB. **Question definitions live in a TypeScript config file** (`lib/application-questions.ts`)
so wording can change without a migration. The keys in that config must match the keys the
`application_public` view reads: `revenue_model`, `target_audience`, `competitive_advantage`,
`timing`, `customer_acquisition`, `milestones`.

**Section 1 — Company**
- Company name (required)
- One-liner (required, 50 char hard cap with live counter)

**Section 2 — Idea** (long form; private to founder, their big, and admins)
- Why did you pick this idea? Do you have domain expertise? How do you know people need this?
- Who are your competitors? What do you understand that they don't?
- What problem are you solving? What is your target audience struggling with, and why are current
  solutions unsatisfying? *(required)*
- Why is your team a winning team? What is your unfair advantage? *(required)*

**Section 3 — Startup Strategy** (400 char cap each, live counter, all required, **public** on the
company page)
- How do or will you make money? How much could you make?
- Who is your target audience?
- What is your competitive advantage?
- Why is now the right timing?
- What is your customer acquisition strategy?
- What are your next major company milestones?

**Escape hatch for Pass 1.** Many new members will have no venture on day one. Offer a
"No venture yet" path that captures problem interest and skills only, creates a placeholder
company, and unlocks the full form at Pass 2. Without this, half the cohort fabricates answers.

**Autosave drafts** into `application_drafts`. Nobody should lose a 400-character answer to a
dropped connection. Debounce to ~2s, and keep the local copy until the server confirms.

---

## FILE STORAGE

Four buckets (plus `sprint` for proof photos). Configured in `0004_storage.sql`.

| Bucket | Access | Max | Types |
|---|---|---|---|
| `avatars` | public read | 2MB | image/* |
| `logos` | public read | 2MB | image/* |
| `decks` | authenticated | 20MB | pdf, pptx |
| `resumes` | authenticated | 5MB | pdf |
| `sprint` | owner + admin | 10MB | image/* |

Path convention, owner ID first so one RLS policy covers the bucket:

```
avatars/{profile_id}/avatar.webp
logos/{company_id}/logo.webp
decks/{company_id}/{timestamp}-{filename}
resumes/{profile_id}/resume.pdf
sprint/{profile_id}/{timestamp}.webp
```

Tables store paths, never binaries. Avatars and logos overwrite at a fixed filename rather than
accumulating versions.

---

## MOBILE AND UPLOADS — HARD REQUIREMENTS

This is the highest-priority non-functional requirement. On November 2, 50 people will use this on
phones in a loud room to decide where money goes. **Build mobile-first and treat desktop as the
enhancement.**

**Image upload**
- `<input type="file" accept="image/*" capture="environment">` so the camera opens directly
- Resize client-side before upload: max 1200px long edge, convert to WebP, quality 0.85
- Upload browser-direct to Supabase Storage using the session token. **Never route file bytes
  through a Vercel function.**
- Local preview via `URL.createObjectURL()` immediately on selection, before upload finishes
- Real percentage progress bar, not a spinner
- Optimistic UI, rollback on failure
- Retry on failure without losing the selected file
- Validate size and type client-side before upload starts, with a specific error message
- Same component handles drag-and-drop on desktop and tap on mobile

**Layout**
- Mobile-first CSS. Write the 375px layout first, add breakpoints upward.
- Test at 375px width as the floor
- 44px minimum touch target on every interactive element
- Directory is a scrollable list on mobile, never a horizontally scrolling table
- Investment flow is a bottom sheet, not a centered modal
- Amount field uses `inputMode="numeric"`
- Balance pinned in a sticky header during the investment window
- Bottom tab bar on mobile: Home, Directory, Updates, Profile
- Zero hover-dependent interactions

---

## NOTIFICATIONS — IN-APP

Bell icon in nav with unread count, dropdown list, mark as read.

Triggers:
- You received an investment
- Your investment was accepted or declined
- Your investment auto-accepted at 72 hours
- An investor attached a resource, mentor intro, or suggestion
- Your sprint entry was approved or rejected
- A company you backed posted an update

---

## NOTIFICATIONS — EMAIL

Resend + React Email. Sending domain must be verified with SPF, DKIM, and DMARC before launch.
Send from a SEPi domain address.

**Principle: email only for actions that require a response.** Everything else stays in-app.

**Immediate sends**
- Investment received on your company — includes the 72-hour deadline
- Response reminder at 24 hours remaining on a pending investment
- Investment declined, funds returned
- Sprint entry rejected, with reason

**Weekly digest, Mondays 7am ET**
- Sessions this week, deadlines, and anything pending your action
- Triggered by a Vercel Cron route handler

**Never email:** investment accepted, new posts, sprint approvals, general activity.

**Implementation**
- All sends go through one server-side `sendEmail()` helper. No Resend calls scattered through
  the codebase.
- Every send writes to `email_log` before and after, with the Resend ID
- Check `profiles.email_prefs` before sending. Skip if opted out (write a `skipped` row).
- Every email includes an unsubscribe link to `/settings/notifications`
- **Email failures must never block the underlying action.** Wrap in try/catch, log the failure,
  continue.
- Reminder and digest jobs run as Vercel Cron routes protected by a `CRON_SECRET` header
- **Idempotency:** every send sets `email_log.dedupe_key` (unique). Reminders use
  `reminder:{investment_id}`. A cron retry hits the unique constraint and no-ops.
- One React Email template with brand colors and the eagle mark, reused across all types. Plain
  text fallback for each.
- Templates must render correctly in **Gmail mobile**, which is where most of these will be read.
  That means tables, inline styles, a PNG logo (not SVG), and no flexbox.

Settings page at `/settings/notifications`: toggle per email type. Admin sees delivery status in
the admin console.

---

## DESIGN DIRECTION

**Steal from:**
- Y Combinator company directory → the directory page, entirely
- Wellfound company profile → the company page header
- Kickstarter → the raise bar and backer count treatment
- Product Hunt → investor note as prominent social proof, not a footnote
- Investopedia stock simulator → persistent balance in the nav

**Do not build:**
- Hero sections
- Marketing copy of any kind
- Gradients
- Illustrations, stock imagery, decorative graphics
- Landing page energy
- Animations beyond simple state transitions

This is a tool, not a pitch. Density over whitespace. If a screen looks like a startup landing
page, it is wrong.

---

## OUT OF SCOPE FOR V1

Do not build: tools library, mentor directory, expert directory, Slack integration, attendance
UI, comments, search across profiles, resume parsing, pods, demo day showcase, charts.

**Timestamp everything.** Every investment, every application pass, every post. V2 charts depend
entirely on that data existing now.

---

## BUILD ORDER

1. Supabase project, full schema, RLS policies, storage buckets — *migrations already written*
2. Auth: invite-only, magic link, profile trigger, middleware
3. Profiles: view, edit, avatar upload, big/little
4. Admin: members and invites
5. Companies: create, edit, logo upload, company page
6. Accelerator Application: three passes, JSONB, escape hatch
7. Directory (YC model)
8. Calendar and dashboard
9. Money Sprint: event, submissions, admin approval, leaderboard
10. Investment portal: ledger, Postgres function, accept/decline, auto-accept cron, portfolio
11. Notifications — in-app first, then email on top of it
12. Updates feed
13. Mobile pass across every page at 375px

Step 11 builds in-app before email. In-app is the primary channel; email is the escalation.
