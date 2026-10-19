import assert from "node:assert/strict";
import test from "node:test";
import {
  LOGIN_ERROR_MESSAGES,
  loginEmailError,
  loginErrorCodeFromAuth,
  loginSendErrorMessage,
  normalizeLoginEmail,
  normalizeOtpToken,
  safeNextPath,
} from "./login";

test("lowercases and trims the email, including the miami domain", () => {
  assert.equal(normalizeLoginEmail("  Wyatt@MiamiOH.EDU "), "wyatt@miamioh.edu");
  assert.equal(loginEmailError("  Wyatt@MiamiOH.EDU "), null);
  assert.match(loginEmailError("not-an-email") ?? "", /valid email/);
});

test("maps vague auth failures to plain sentences", () => {
  assert.equal(
    loginSendErrorMessage({ message: "Signups not allowed for otp", status: 400 }),
    "That email is not on the member list yet. Ask Wyatt to add you."
  );
  assert.equal(
    loginSendErrorMessage({ code: "over_email_send_rate_limit", message: "email rate limit exceeded", status: 429 }),
    "Wait 60 seconds and try again."
  );
  assert.equal(
    loginErrorCodeFromAuth({
      message: "PKCE code verifier not found in storage.",
      code: "pkce_code_verifier_not_found",
    }),
    "pkce"
  );
  assert.match(LOGIN_ERROR_MESSAGES.pkce, /different browser/);
  assert.equal(
    loginErrorCodeFromAuth({ message: "Email link is invalid or has expired" }),
    "expired"
  );
});

test("otp codes are 6 to 8 digits", () => {
  assert.deepEqual(normalizeOtpToken("123 456"), { ok: true, token: "123456" });
  assert.deepEqual(normalizeOtpToken("12345678"), { ok: true, token: "12345678" });
  assert.equal(normalizeOtpToken("12345").ok, false);
  assert.equal(normalizeOtpToken("123456789").ok, false);
});

test("next path stays on this site", () => {
  assert.equal(safeNextPath("/sprint"), "/sprint");
  assert.equal(safeNextPath("https://evil.example"), "/companies");
  assert.equal(safeNextPath("//evil.example"), "/companies");
});
