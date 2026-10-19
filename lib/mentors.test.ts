import assert from "node:assert/strict";
import test from "node:test";
import { parseMentorUrl } from "./mentors";

test("mentor links accept bare domains, company pages, and tracking params", () => {
  const person = parseMentorUrl("linkedin.com/in/Ada-Lovelace?utm_source=share&utm_medium=ios_app");
  assert.equal(person.ok, true);
  if (!person.ok) return;
  assert.equal(person.mentor.linkedin_url, "https://www.linkedin.com/in/ada-lovelace");

  const company = parseMentorUrl("www.linkedin.com/company/acme?trk=public");
  assert.equal(company.ok, true);
  if (!company.ok) return;
  assert.equal(company.mentor.linkedin_slug, "acme");

  const accent = parseMentorUrl("https://linkedin.com/in/josé_maría");
  assert.equal(accent.ok, true);
  if (!accent.ok) return;
  assert.equal(accent.mentor.linkedin_slug, "josé_maría");
});
