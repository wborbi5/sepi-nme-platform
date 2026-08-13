type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Thirty lines beats a dependency. No conflict resolution — this codebase
 * writes classes in one direction, so last-wins merging is not needed.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    out.push(String(v));
  };
  values.forEach(walk);
  return out.join(" ");
}
