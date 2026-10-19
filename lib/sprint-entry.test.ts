import assert from "node:assert/strict";
import test from "node:test";
import { sprintEntryError, sprintEntrySchema } from "./sprint-entry";
import { sprintProofError } from "./sprint-proof";

test("sprint entry accepts 12.50 and a proof path", () => {
  const parsed = sprintEntrySchema.safeParse({
    event_id: "11111111-1111-4111-8111-111111111111",
    amount_delivered: "$12.50",
    amount_pre_service: "0",
    description: "  lemonade  ",
    proof_path: "user/1.pdf",
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.amount_delivered, 12.5);
  assert.equal(parsed.data.amount_pre_service, 0);
  assert.equal(parsed.data.description, "lemonade");
});

test("sprint entry explains a bad amount and a missing proof", () => {
  const amount = sprintEntrySchema.safeParse({
    event_id: "11111111-1111-4111-8111-111111111111",
    amount_delivered: "12.555",
    amount_pre_service: "1",
    proof_path: "user/1.jpg",
  });
  assert.equal(amount.success, false);
  if (!amount.success) assert.match(sprintEntryError(amount.error), /2 decimal places/);

  const proof = sprintEntrySchema.safeParse({
    event_id: "11111111-1111-4111-8111-111111111111",
    amount_delivered: "10",
    amount_pre_service: "0",
    proof_path: "  ",
  });
  assert.equal(proof.success, false);
  if (!proof.success) assert.match(sprintEntryError(proof.error), /proof photo or PDF/);

  const zero = sprintEntrySchema.safeParse({
    event_id: "11111111-1111-4111-8111-111111111111",
    amount_delivered: "0",
    amount_pre_service: "$0.00",
    proof_path: "user/1.jpg",
  });
  assert.equal(zero.success, false);
  if (!zero.success) assert.match(sprintEntryError(zero.error), /greater than zero/);
});

test("proof accepts common images and pdfs, and rejects the rest", () => {
  assert.equal(sprintProofError({ name: "receipt.pdf", type: "application/pdf", size: 1024 }), null);
  assert.equal(sprintProofError({ name: "shot.HEIC", type: "", size: 1024 }), null);
  assert.equal(sprintProofError({ name: "shot.png", type: "image/png", size: 1024 }), null);
  assert.match(
    sprintProofError({ name: "notes.txt", type: "text/plain", size: 10 }) ?? "",
    /photo/
  );
  assert.match(
    sprintProofError({ name: "big.pdf", type: "application/pdf", size: 60 * 1024 * 1024 }) ?? "",
    /50MB/
  );
});
