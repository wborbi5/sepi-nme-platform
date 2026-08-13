import { cn } from "@/lib/cn";

/**
 * The ΣΗΠ seal, drawn rather than imported.
 *
 * docs/BRAND.md flags the eagle mark as still needing an SVG export. When
 * `public/logo/eagle-white.svg` exists, swap the monogram group for an <image>
 * — the ring, sizing, and clear space are already correct.
 *
 * White mark on dark, per the guide. There is no other variant in this app,
 * because there is no light surface in this app.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Sigma Eta Pi"
      className={cn("shrink-0", className)}
    >
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="600"
        fontSize="19"
        letterSpacing="0.5"
      >
        ΣΗΠ
      </text>
    </svg>
  );
}

/** Full lockup for the login screen and the drawer header. */
export function Lockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Mark size={34} className="text-[var(--cloud-white)]" />
      <div className="leading-tight">
        <div className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-[var(--cloud-white)]">
          Sigma Eta Pi
        </div>
        <div className="eyebrow">New Member Education</div>
      </div>
    </div>
  );
}
