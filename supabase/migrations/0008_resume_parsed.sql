-- Parsed-resume storage. The raw PDF stays in the resumes bucket,
-- untouched and always downloadable; this column holds the structured
-- extraction (summary, skills, experience) that renders on profiles.
-- Shape is owned by lib/resume-parser.ts, not the database.

alter table profiles
  add column if not exists resume_parsed jsonb;
