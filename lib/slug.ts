/** URL slug from a display name (or email local-part). */
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "member";
}
