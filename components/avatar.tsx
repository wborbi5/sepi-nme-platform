import { cn } from "@/lib/cn";
import { avatarUrl, logoUrl } from "@/lib/storage";

function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}

/**
 * The circle. Top right of every screen when it is yours, and everywhere a
 * person is mentioned when it is not.
 */
export function Avatar({
  name,
  path,
  size = 32,
  className,
  ring,
}: {
  name?: string | null;
  path?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const src = avatarUrl(path);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-alt)] align-middle",
        ring && "ring-1 ring-[var(--color-border-strong)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden={!name}
    >
      {src ? (
        // Avatars are pre-resized to 1200px WebP on upload; the optimizer adds
        // a hop for no gain on a 32px circle.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-[family-name:var(--font-display)] font-semibold leading-none text-[var(--mist-blue)]"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Company logos are squares with a hairline, not circles. */
export function LogoTile({
  name,
  path,
  size = 40,
  className,
}: {
  name: string;
  path?: string | null;
  size?: number;
  className?: string;
}) {
  const src = logoUrl(path);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-alt)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- see Avatar.
        <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-[family-name:var(--font-display)] font-semibold leading-none text-[var(--mist-blue)]"
          style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
