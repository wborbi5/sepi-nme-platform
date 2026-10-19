/** Magic-link / OTP sign-in. Forgiving on case, whitespace, and Supabase's wording. */

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  pkce: "This sign-in link was opened in a different browser or app. Request a new link here and open it in this same browser.",
  expired: "That sign-in link expired or was already used. Request a new one.",
  auth: "That sign-in link didn't work. Request a new one.",
  link: "That sign-in link didn't work. Request a new one and open it in this browser.",
  rate: "Wait 60 seconds and try again.",
};

const NOT_ON_LIST = "That email is not on the member list yet. Ask Wyatt to add you.";
const RATE_LIMIT = LOGIN_ERROR_MESSAGES.rate;
const BAD_EMAIL = "Enter a valid email like you@miamioh.edu.";
const BAD_CODE = "Enter the 6 to 8 digit code from the email.";
const CODE_MISMATCH = "That code didn't match. Enter the 6 to 8 digit code from the email.";

export function normalizeLoginEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function loginEmailError(raw: string): string | null {
  const email = normalizeLoginEmail(raw);
  if (!email) return "Enter your Miami email.";
  // Practical shape only. Domain case is already folded by lowercasing,
  // so Wyatt@MiamiOH.edu is the same address as wyatt@miamioh.edu.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return BAD_EMAIL;
  return null;
}

/** Relative in-app path. Anything else goes to the member home. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/companies";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return "/companies";
  return next;
}

function errorBlob(err: unknown): { blob: string; status: number } {
  if (!err || typeof err !== "object") {
    return { blob: err instanceof Error ? err.message : String(err ?? ""), status: 0 };
  }
  const record = err as { message?: unknown; code?: unknown; status?: unknown };
  const message = record.message == null ? "" : String(record.message);
  const code = record.code == null ? "" : String(record.code);
  const status = typeof record.status === "number" ? record.status : Number(record.status ?? 0);
  return { blob: `${code} ${message}`, status: Number.isFinite(status) ? status : 0 };
}

export function loginErrorCodeFromAuth(err: unknown): string {
  const { blob, status } = errorBlob(err);
  if (/pkce|code verifier|both auth code|code challenge/i.test(blob)) return "pkce";
  if (status === 429 || /rate limit|too many|over_email_send_rate_limit|over_request_rate_limit|only request this after/i.test(blob)) {
    return "rate";
  }
  if (/expired|otp_expired/i.test(blob)) return "expired";
  return "link";
}

export function loginSendErrorMessage(err: unknown): string {
  const { blob, status } = errorBlob(err);
  if (status === 429 || /rate limit|too many|over_email_send_rate_limit|over_request_rate_limit|only request this after/i.test(blob)) {
    return RATE_LIMIT;
  }
  if (/invalid email|unable to validate email|invalid format/i.test(blob)) return BAD_EMAIL;
  if (/signups not allowed|user not found|user_not_found|not found|otp_disabled|signup_disabled|user banned/i.test(blob)) {
    return NOT_ON_LIST;
  }
  return "Couldn't send the link. Check the email and try again.";
}

export function normalizeOtpToken(raw: string): { ok: true; token: string } | { ok: false; error: string } {
  const token = raw.replace(/[\s-]/g, "");
  if (!/^\d{6,8}$/.test(token)) return { ok: false, error: BAD_CODE };
  return { ok: true, token };
}

export function loginVerifyErrorMessage(err: unknown): string {
  const { blob, status } = errorBlob(err);
  if (status === 429 || /rate limit|too many|only request this after/i.test(blob)) return RATE_LIMIT;
  if (/expired|otp_expired/i.test(blob)) return "That code expired. Request a new link.";
  if (/invalid|otp_expired|token/i.test(blob)) return CODE_MISMATCH;
  return CODE_MISMATCH;
}
