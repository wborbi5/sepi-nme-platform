-- Portal redesign fields.
-- Companies become filterable by industry and founding year; profiles gain
-- a pledge class ("when they pledged SEPi") and a URL slug for /p/[slug].

alter table companies
  add column industry     text,
  add column founded_year integer check (founded_year >= 2000 and founded_year <= 2100);

create index companies_industry_idx on companies (industry);

alter table profiles
  add column pledge_class text,          -- e.g. 'Fall 2025' — when they pledged SEPi
  add column slug         text unique,   -- generated once, used in /p/[slug] URLs
  add column position     text;          -- e.g. 'Co-President' — shown on People page

-- Public application answers view already exists; nothing else changes.
