# Setup checklist — the human-only parts

Everything here needs a person with an account and a credit card. An agent cannot do any of it.
Work top to bottom; each section unblocks the one after it.

Target: all of this done well before **Nov 2 2026**, when the investment window opens.

---

## 1. Supabase

- [ ] Create a project at [supabase.com](https://supabase.com). Region: **East US (North Virginia)** —
      closest to Oxford, Ohio.
- [ ] Name it `sepi-nme`. Save the database password somewhere you will not lose it.
- [ ] Run the migrations in order from the SQL Editor:
      `0001_schema.sql` → `0002_functions.sql` → `0003_rls.sql` → `0004_storage.sql` → `0005_cron.sql`
- [ ] Before `0005`, enable **pg_cron**: Database → Extensions → search `pg_cron` → enable.
- [ ] Authentication → Providers: **disable email signup**, leave magic link enabled.
- [ ] Authentication → Email Templates: set the magic link expiry to **7 days** (604800 seconds).
- [ ] Authentication → URL Configuration: set Site URL to the production domain and add
      `http://localhost:3000/**` to redirect allow-list for local dev.
- [ ] Copy these from Settings → API:
      - Project URL
      - `anon` public key
      - `service_role` key — **this one never goes in client code and never gets committed**

### Make yourself the first admin

There is no signup, so the first account has to be created by hand.

- [ ] Authentication → Users → **Add user** → your `@miamioh.edu` address, auto-confirm on.
- [ ] SQL Editor: `update profiles set role = 'admin', full_name = 'Your Name' where email = 'you@miamioh.edu';`
- [ ] Confirm: `select id, email, role from profiles;`

---

## 2. Logo assets

The brand guide PDF still carries the old mark. The current one is the navy eagle with the ΣΗΠ
lockup.

- [ ] Export the eagle mark as SVG, navy `#1F3A5F` on transparent → `public/logo/eagle-navy.svg`
- [ ] Export a white version for dark backgrounds → `public/logo/eagle-white.svg`
- [ ] Export a 512px PNG → `public/logo/eagle-navy-512.png` (Gmail will not render SVG)
- [ ] Export a 32px favicon → `app/icon.png`
- [ ] Update the brand guide PDF with the new mark while you're in there

---

## 3. Domain and email

Skip this whole section if email is being deferred past launch — the app works without it, and
in-app notifications are the primary channel.

- [ ] Decide the sending domain. Something like `sepi.miamioh.edu` will require university IT
      approval and probably will not happen in time — assume you need to buy a domain
      (`sepimiami.org` or similar) and control DNS yourself.
- [ ] Create a [Resend](https://resend.com) account. Free tier is 3,000 emails/month, which is far
      more than 50 people need.
- [ ] Resend → Domains → add your domain. Resend gives you three DNS records.
- [ ] Add all three at your registrar: **SPF** (TXT), **DKIM** (TXT or CNAME), **DMARC** (TXT).
      Start DMARC at `p=none` so nothing gets silently dropped while you're testing.
- [ ] Wait for Resend to show the domain **Verified**. This can take up to 48 hours. Do not
      schedule this for the week of launch.
- [ ] Pick the from-address: `noreply@yourdomain` with a reply-to that reaches a real human.
- [ ] Copy the Resend API key.
- [ ] Send yourself a test to a **Gmail account, opened on a phone.** That is where these will be
      read and it is the only rendering target that matters.

---

## 4. Vercel

- [ ] Import the GitHub repo at [vercel.com](https://vercel.com).
- [ ] Add environment variables (see `.env.example` for the full list). Set them for Production,
      Preview, and Development.
- [ ] Generate `CRON_SECRET`: any long random string. It protects the cron routes from being hit
      by anyone who guesses the URL.
- [ ] Confirm the cron entries in `vercel.json` appear under Settings → Cron Jobs after the first
      deploy. Vercel's Hobby plan allows **one cron invocation per day** — if the 24-hour investment
      reminder needs to run hourly, you need the Pro plan ($20/mo) for that month. Budget for it.
- [ ] Point the domain at the Vercel deployment.

---

## 5. Content before launch

- [ ] Load the NME calendar into `cal_events` — every session, dated, with week numbers.
- [ ] Draft the member roster: name, `@miamioh.edu` email, role. A spreadsheet is fine; the bulk
      invite takes newline-separated emails.
- [ ] Decide big/little pairings, or plan to set them in the admin console after profiles exist.
- [ ] Write the Money Sprint rules somewhere members can read them. The app shows the leaderboard,
      not the rules.

---

## 6. Launch day — Nov 2

- [ ] Flip `investment_window_open` to true in Admin → Settings. **Not before.** The date fields in
      `app_settings` are documentation; the boolean is the gate.
- [ ] Have the admin console open on a laptop. You will be force-resolving something.
- [ ] Confirm the room's wifi actually works before 50 phones hit it. If it does not, the
      client-side image resizing is what saves you.

---

## Rough cost

| | |
|---|---|
| Supabase free tier | $0 — 50 users and a few hundred MB is nowhere near the limits |
| Vercel Hobby | $0, or $20 for the month if you need hourly crons |
| Resend free tier | $0 |
| Domain | ~$12/year |

Under $50 for the whole semester.
