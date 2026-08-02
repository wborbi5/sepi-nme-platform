-- SEPi NME Platform — scheduled jobs
--
-- Enable pg_cron from the Supabase dashboard first:
--   Database → Extensions → pg_cron → enable
-- It must be installed into the `extensions` schema (Supabase default).

create extension if not exists pg_cron with schema extensions;

-- Auto-accept anything pending past 72 hours. Hourly is fine — the deadline
-- is a soft one and an hour of slack is invisible to a founder.
select cron.schedule(
  'auto-accept-investments',
  '0 * * * *',
  $$ select auto_accept_stale_investments(); $$
);

-- To remove:  select cron.unschedule('auto-accept-investments');
-- To inspect: select * from cron.job_run_details order by start_time desc limit 20;

-- NOTE: the 24-hours-remaining reminder email and the Monday 7am ET digest
-- are Vercel Cron routes, not pg_cron — they need Resend, which lives in the
-- Next.js runtime. See docs/BUILD_SPEC.md § Email.
