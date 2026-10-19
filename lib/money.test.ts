import assert from "node:assert/strict";
import test from "node:test";
import { formatSprintMoney, parseSprintAmount } from "./money";

test("accepts dollars and cents, dollar signs, and commas", () => {
  assert.deepEqual(parseSprintAmount("12.50", "Profit"), {
    ok: true,
    cents: 1250,
    amountText: "12.50",
  });
  assert.deepEqual(parseSprintAmount("$1,234.50", "Profit"), {
    ok: true,
    cents: 123450,
    amountText: "1234.50",
  });
  assert.deepEqual(parseSprintAmount("  $12.5 ", "Profit"), {
    ok: true,
    cents: 1250,
    amountText: "12.50",
  });
  assert.deepEqual(parseSprintAmount(".5", "Profit"), {
    ok: true,
    cents: 50,
    amountText: "0.50",
  });
  assert.deepEqual(parseSprintAmount("", "Profit"), {
    ok: true,
    cents: 0,
    amountText: "0.00",
  });
});

test("rejects a third non-zero decimal and negatives", () => {
  const extra = parseSprintAmount("12.555", "Profit");
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.match(extra.error, /2 decimal places/);

  const trailingZero = parseSprintAmount("12.500", "Profit");
  assert.equal(trailingZero.ok, true);

  const negative = parseSprintAmount("-1", "Profit");
  assert.equal(negative.ok, false);
  if (!negative.ok) assert.match(negative.error, /negative/);
});

test("formats cents", () => {
  assert.equal(formatSprintMoney("12.50"), "$12.50");
  assert.equal(formatSprintMoney(12.5), "$12.50");
});
