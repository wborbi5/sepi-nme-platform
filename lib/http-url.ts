/*
 * Members paste bare domains ("czarcrm.com", "linkedin.com/in/x",
 * "www.x.com") and links that still have tracking query params.
 * Normalize those to https:// before checking the scheme. Empty input
 * is null. Anything that is not http(s) is rejected by the caller.
 */

const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):/i;

function hasExplicitScheme(value: string): boolean {
  const match = EXPLICIT_SCHEME.exec(value);
  // "czarcrm.com:8080" is host:port. Schemes do not contain a dot.
  return Boolean(match && !match[1].includes("."));
}

function cleanUrlText(raw: string): string {
  return raw
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/^['"]|['"]$/g, "")
    .trim()
    .replace(/\s+/g, "");
}

/** Trim, map empty to null, and add https:// when the value has no scheme. */
export function normalizeOptionalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = cleanUrlText(raw);
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return hasExplicitScheme(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname;
    if (!host) return false;
    // "hello" is not a domain. "linkedin.com" and "www.x.com" are.
    if (host !== "localhost" && !host.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize first, then accept only http(s). Empty is success with null.
 * Query strings (utm tags and the rest) are kept as pasted.
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
