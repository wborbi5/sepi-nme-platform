import assert from "node:assert/strict";
import test from "node:test";
import { parseProfileForm, profileNeedsOnboarding } from "./profile-form";

test("only full name is required", () => {
  const parsed = parseProfileForm({ full_name: "  Ada Lovelace  " });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.full_name, "Ada Lovelace");
  assert.equal(parsed.value.major, null);
  assert.equal(parsed.value.grad_year, null);
  assert.equal(parsed.value.linkedin_url, null);
  assert.equal(parsed.value.pledge_class, null);
  assert.equal(parsed.value.bio, null);
});

test("trims and normalizes optional fields", () => {
  const parsed = parseProfileForm({
    full_name: "Ada",
    major: "  Finance + CS  ",
    grad_year: " Class of 2028 ",
    pledge_class: "  Fall 2025 ",
    linkedin_url: " linkedin.com/in/ada?utm_source=share&utm_medium=ios_app ",
    skills: " Python,  cold outreach ",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.major, "Finance + CS");
  assert.equal(parsed.value.grad_year, 2028);
  assert.equal(parsed.value.pledge_class, "Fall 2025");
  assert.equal(
    parsed.value.linkedin_url,
    "https://linkedin.com/in/ada?utm_source=share&utm_medium=ios_app"
  );
  assert.deepEqual(parsed.value.skills, ["Python", "cold outreach"]);
});

test("blank graduation year is empty, nonsense is a specific error", () => {
  const blank = parseProfileForm({ full_name: "Ada", grad_year: "   " });
  assert.equal(blank.ok, true);
  if (blank.ok) assert.equal(blank.value.grad_year, null);

  const bad = parseProfileForm({ full_name: "Ada", grad_year: "soon" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /Graduation year/);

  const missing = parseProfileForm({ full_name: "   " });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error, "Full name is required.");
});

test("onboarding is done once name and slug exist", () => {
  assert.equal(profileNeedsOnboarding({ full_name: "  ", slug: "ada" }), true);
  assert.equal(profileNeedsOnboarding({ full_name: "Ada", slug: "" }), true);
  assert.equal(profileNeedsOnboarding({ full_name: "Ada", slug: "ada" }), false);
  assert.equal(profileNeedsOnboarding(null), true);
});
