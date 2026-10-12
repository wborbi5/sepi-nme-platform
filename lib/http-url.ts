/*
 * Members paste bare domains ("czarcrm.com") into company website and demo
 * fields. Normalize those to https:// before checking the scheme. Empty
 * input is null. Anything that is not http(s) is rejected by the caller.
 */

const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):/i;

function hasExplicitScheme(value: string): boolean {
  const match = EXPLICIT_SCHEME.exec(value);
  // "czarcrm.com:8080" is host:port. Schemes do not contain a dot.
  return Boolean(match && !match[1].includes("."));
}

/** Trim, map empty to null, and add https:// when the value has no scheme. */
export function normalizeOptionalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return hasExplicitScheme(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Normalize first, then accept only http(s). Empty is success with null.
 * A non-string is not a URL.
 */
export function optionalHttpUrl(
  raw: unknown
): { ok: true; value: string | null } | { ok: false } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  const normalized = normalizeOptionalUrl(raw);
  if (normalized === null) return { ok: true, value: null };
  if (!isHttpUrl(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}
