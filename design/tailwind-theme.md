# Tailwind theme wiring

Tailwind v4 reads `@theme` directly from CSS. This is already wired in
[`app/globals.css`](../app/globals.css) — the file imports Tailwind, then `design/tokens.css`,
then maps the semantic tokens into an `@theme inline` block.

The tokens are the source of truth. Change a color in `design/tokens.css` and every utility
follows; do not add colors to the `@theme` block that are not tokens first.

## Fonts

Loaded through `next/font/google` in [`lib/fonts.ts`](../lib/fonts.ts), so there is no
render-blocking network request. Only Fraunces 600 is pulled — the guide permits no other
headline weight, and every extra weight is payload on a phone in a room with bad wifi.

The `--font-display-loaded` / `--font-body-loaded` CSS variables are attached to `<html>` in the
root layout; `--font-display` and `--font-body` in `tokens.css` are the names components use.

## Components

**shadcn/ui is not installed.** The dark treatment needed tokens-first components rather than a
generated neutral scale, and the whole kit fits in one file:
[`components/ui.tsx`](../components/ui.tsx) — `Button`, `Field`, `Input`, `Textarea`, `Select`,
`Chip`, `Card`, `Figure`, `Eyebrow`, `Empty`, `Divider`.

Two rules that kit encodes:

- **Radii stay small.** `--radius` is 3px, `--radius-lg` 6px. This is a dense tool, not a
  consumer app.
- **Every interactive element clears 44px.** `--tap-min` is applied in `globals.css` to buttons,
  inputs, selects, and textareas. Chips and inline controls opt out with `min-h-0` only where they
  sit inside a larger tap target.

## Utilities worth knowing

| Class | What it does |
|---|---|
| `.figure` | Fraunces 600, tabular numerals, tight tracking. Every number the user is meant to notice. |
| `.eyebrow` | Karla 500, uppercase, tracked, dim. The guide's label treatment. |
| `.prose-sepi` | Markdown bodies inside posts and profiles. |
