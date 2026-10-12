/** Shared login for the platform itself, not a person who can co-found. */
export const SYSTEM_ACCOUNT_EMAIL = "sigmaetapimiami@gmail.com";

/*
 * Co-founder eligibility. Inactive profiles, blank names, and the system
 * account are excluded. Role is intentionally not a filter — admins are
 * members and can be on a founding team.
 */
export function isEligibleCofounder(profile: {
  full_name: string | null;
  email: string | null;
  is_active: boolean;
}): boolean {
  if (!profile.is_active) return false;
  if (!profile.full_name?.trim()) return false;
  const email = profile.email?.trim().toLowerCase() ?? "";
  if (email === SYSTEM_ACCOUNT_EMAIL) return false;
  return true;
}
