# Tailwind theme wiring

Tailwind v4 reads `@theme` directly from CSS. Add this after importing `design/tokens.css`:

```css
@import "tailwindcss";

@theme inline {
  --color-navy: var(--executive-navy);
  --color-midnight: var(--midnight);
  --color-slate-blue: var(--slate-blue);
  --color-cloud: var(--cloud-white);
  --color-oxford: var(--oxford-blue);
  --color-powder: var(--powder-blue);
  --color-cobalt: var(--cobalt);
  --color-mist: var(--mist-blue);
  --color-steel: var(--steel-gray);
  --color-stone: var(--stone);
  --color-graphite: var(--graphite);
  --color-charcoal: var(--charcoal);

  --font-display: var(--font-display);
  --font-sans: var(--font-body);
}
```

If the project ends up on Tailwind v3, use the equivalent `theme.extend.colors` map in
`tailwind.config.ts` pointing at the same CSS variables.

## Fonts

Load through `next/font/google` so there is no render-blocking network request:

```ts
import { Fraunces, Karla } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});
```

Only pull Fraunces 600. The guide permits no other weight, and every extra weight is a payload
cost on a phone in a room with bad wifi.

## shadcn/ui

Run `npx shadcn@latest init` and point its CSS variables at the semantic tokens
(`--color-primary`, `--color-bg`, `--color-border`, …) rather than letting it generate its own
neutral scale. Do not accept the default shadcn radius — this is a dense tool, keep radii small
(2–4px).
