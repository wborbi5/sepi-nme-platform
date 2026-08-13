/**
 * Storage paths are stored in tables; bytes never are, and never pass through
 * a function. These helpers only build URLs.
 */

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export type PublicBucket = "avatars" | "logos";

export function publicUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE}/storage/v1/object/public/${bucket}/${path}`;
}

export const avatarUrl = (path: string | null | undefined) => publicUrl("avatars", path);
export const logoUrl = (path: string | null | undefined) => publicUrl("logos", path);

/** Fixed filenames — avatars and logos overwrite rather than accumulate. */
export const avatarPath = (profileId: string) => `${profileId}/avatar.webp`;
export const logoPath = (companyId: string) => `${companyId}/logo.webp`;
