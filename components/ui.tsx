import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------- buttons */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 " +
  "text-[14px] font-medium leading-none transition-colors duration-100 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const VARIANT = {
  /* On a near-black ground the lightest fill is the loudest. */
  primary:
    "bg-[var(--cloud-white)] text-[var(--midnight)] hover:bg-white active:bg-[#e6ebf2]",
  /* Cobalt, lifted for dark. The one pop of color, used for the money moment. */
  accent:
    "bg-[var(--cobalt-lift)] text-white hover:bg-[#7285f7] active:bg-[#4d63e0]",
  outline:
    "border border-[var(--color-border-strong)] text-[var(--cloud-white)] " +
    "hover:border-[var(--mist-blue)] hover:bg-[var(--ink-raised)]",
  ghost: "text-[var(--color-text-muted)] hover:text-[var(--cloud-white)] hover:bg-[var(--ink-raised)]",
  danger: "border border-[#5b2126] text-[var(--color-danger)] hover:bg-[#1c0e11]",
} as const;

type Variant = keyof typeof VARIANT;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(BUTTON_BASE, VARIANT[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      className={cn(BUTTON_BASE, VARIANT[variant], "min-h-[var(--tap-min)]", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ text */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

/**
 * A number that carries weight. The whole point of the dark ground: concrete
 * figures in Cloud White Fraunces are the loudest thing on screen, and no
 * decoration is needed to make them so.
 */
export function Figure({
  value,
  label,
  sub,
  className,
}: {
  value: ReactNode;
  label?: string;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Eyebrow className="mb-1.5">{label}</Eyebrow> : null}
      <div className="figure text-[26px] text-[var(--cloud-white)]">{value}</div>
      {sub ? <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">{sub}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- chrome */

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--ink-raised)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionHead({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-dim)]">
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ chips */

const TONE = {
  neutral: "border-[var(--color-border-strong)] text-[var(--color-text-muted)]",
  bright: "border-[var(--mist-blue)] text-[var(--cloud-white)]",
  accent: "border-[var(--cobalt-lift)] text-[#a3b0ff]",
  success: "border-[#1e4b31] text-[var(--color-success)]",
  warning: "border-[#5c4318] text-[var(--color-warning)]",
  danger: "border-[#5b2126] text-[var(--color-danger)]",
} as const;

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] leading-[1.4] whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ empty */

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-[13px] text-[var(--color-text-dim)]">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--cloud-white)]">{label}</span>
        {optional ? (
          <span className="text-[11px] text-[var(--color-text-dim)]">optional</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="mt-1.5 text-[12px] text-[var(--color-danger)]">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 text-[12px] text-[var(--color-text-dim)]">{hint}</div>
      ) : null}
    </label>
  );
}

export const INPUT_CLASS =
  "w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] " +
  "bg-[var(--ink-sunken)] px-3 py-2.5 text-[15px] text-[var(--cloud-white)] " +
  "placeholder:text-[var(--color-text-dim)] focus:border-[var(--cobalt-lift)] " +
  "focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(INPUT_CLASS, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(INPUT_CLASS, "min-h-[96px] resize-y leading-[1.5]", className)} {...props} />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(INPUT_CLASS, "appearance-none pr-8", className)} {...props} />;
}

/* ------------------------------------------------------------------ misc */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-[var(--color-border)]", className)} />;
}
