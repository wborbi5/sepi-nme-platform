import { z } from "zod";

/*
 * Sprint amounts are dollars and cents. Strip $ and commas, then
 * z.coerce.number().min(0).multipleOf(0.01) — not integers.
 */

export const PROOF_MESSAGE = "Add a proof photo or PDF before submitting.";

export function sprintMoney(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return value ?? 0;
      const stripped = value.replace(/[$,\s]/g, "");
      return stripped === "" ? 0 : stripped;
    },
    z.coerce
      .number({
        invalid_type_error: `${label} must be a number like 12.50. Dollar signs and commas are fine.`,
      })
      .min(0, `${label} can't be negative.`)
      .multipleOf(0.01, `${label} can have at most 2 decimal places, like 12.50.`)
  );
}

export const sprintEntrySchema = z
  .object({
    event_id: z
      .string({
        required_error: "This sprint submission is missing its event. Refresh and try again.",
      })
      .uuid("This sprint submission is missing its event. Refresh and try again."),
    amount_delivered: sprintMoney("Profit"),
    amount_pre_service: sprintMoney("Pre-service"),
    description: z.preprocess(
      (value) => (typeof value === "string" ? value : ""),
      z.string().trim().max(500, "Description must be 500 characters or fewer.")
    ),
    proof_path: z.preprocess(
      (value) => (typeof value === "string" ? value : ""),
      z.string().trim().min(1, PROOF_MESSAGE)
    ),
  })
  .superRefine((value, ctx) => {
    if (value.amount_delivered === 0 && value.amount_pre_service === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an amount greater than zero.",
        path: ["amount_delivered"],
      });
    }
  });

export function sprintEntryError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the amounts and try again.";
}
