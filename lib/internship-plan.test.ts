import assert from "node:assert/strict";
import test from "node:test";
import { parseInternshipPlan } from "./internship-plan";

test("an empty pipeline form is valid", () => {
  const parsed = parseInternshipPlan({});
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.summer_27_plan, null);
  assert.equal(parsed.value.summer_27_plan_other, null);
  assert.equal(parsed.value.preferred_location, null);
  assert.equal(parsed.value.job_type, null);
  assert.equal(parsed.value.company_size, null);
  assert.deepEqual(parsed.value.summer_end_goals, []);
  assert.equal(parsed.value.brand_strengths, null);
  assert.equal(parsed.value.gaps, null);
  assert.deepEqual(parsed.value.help_wanted, []);
  assert.equal(parsed.value.notes, null);
});

test("trims text, keeps other-note only for other, and dedupes multi-selects", () => {
  const parsed = parseInternshipPlan({
    summer_27_plan: " other ",
    summer_27_plan_other: "  research year ",
    preferred_location: "  Chicago  ",
    job_type: "  product ",
    company_size: "small",
    summer_end_goals: ["experience", "experience", "skills"],
    brand_strengths: "  resume, proof of work ",
    gaps: " interviewing ",
    help_wanted: "resume",
    notes: "  want a team ",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.summer_27_plan, "other");
  assert.equal(parsed.value.summer_27_plan_other, "research year");
  assert.equal(parsed.value.preferred_location, "Chicago");
  assert.equal(parsed.value.job_type, "product");
  assert.equal(parsed.value.company_size, "small");
  assert.deepEqual(parsed.value.summer_end_goals, ["experience", "skills"]);
  assert.equal(parsed.value.brand_strengths, "resume, proof of work");
  assert.equal(parsed.value.gaps, "interviewing");
  assert.deepEqual(parsed.value.help_wanted, ["resume"]);
  assert.equal(parsed.value.notes, "want a team");
});

test("other-note is dropped unless the goal is other", () => {
  const parsed = parseInternshipPlan({
    summer_27_plan: "internship",
    summer_27_plan_other: "ignore me",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.summer_27_plan, "internship");
  assert.equal(parsed.value.summer_27_plan_other, null);
});

test("rejects unknown goal, company size, and help options", () => {
  const goal = parseInternshipPlan({ summer_27_plan: "travel" });
  assert.equal(goal.ok, false);
  if (!goal.ok) assert.match(goal.error, /Summer plan/);

  const size = parseInternshipPlan({ company_size: "medium" });
  assert.equal(size.ok, false);
  if (!size.ok) assert.match(size.error, /Company size/);

  const help = parseInternshipPlan({ help_wanted: ["resume", "coffee"] });
  assert.equal(help.ok, false);
  if (!help.ok) assert.match(help.error, /Help wanted/);
});

test("rejects oversized location text", () => {
  const parsed = parseInternshipPlan({ preferred_location: "x".repeat(201) });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /Location/);
});
