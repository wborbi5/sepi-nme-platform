# SEPi Brand — extracted from Brand Guide v1.0

Source: `SEPiBrandGuide.pdf` (Sigma Eta Pi, Miami University Chapter).

## Primary palette — ~80% of all branding

| Name | Hex | Use |
|---|---|---|
| Midnight | `#101828` | Primary text, logos, dark backgrounds |
| Executive Navy | `#1F3A5F` | **Main brand color** |
| Slate Blue | `#516B84` | Secondary brand accents |
| Cloud White | `#F8FAFC` | Primary background |
| Pure White | `#FFFFFF` | Negative space |

## Secondary palette — variety without overpowering

| Name | Hex | Use |
|---|---|---|
| Steel Gray | `#6B7280` | Secondary text |
| Cool Gray | `#D1D5DB` | Dividers, borders |
| Stone | `#E5E7EB` | Cards |
| Mist Blue | `#A7B6C5` | Icons, backgrounds |
| Charcoal | `#374151` | Dark accent |

## Accent palette — 5–10% of any design, sparingly

| Name | Hex | Use |
|---|---|---|
| Oxford Blue | `#2C4A73` | Buttons, links |
| Powder Blue | `#BFCFDD` | Highlights |
| Graphite | `#4B5563` | Charts, infographics |
| Cobalt | `#1B2A8C` | Pop-of-color accents, CTAs, hover states |

## Typography

Both fonts are free on Google Fonts.

| Role | Font |
|---|---|
| Headlines | **Fraunces**, Semibold (600) |
| Eyebrows / labels | **Karla**, Medium (500), uppercase, tracked |
| Body copy | **Karla**, Regular (400) |

- Headlines and logo lockups always use Fraunces 600.
- **Never use Fraunces for paragraph text** — its optical sizing is built for large display use only.
- Karla carries everything else: body, captions, buttons, navigation.

## Usage notes from the guide

- Executive Navy is the workhorse — primary logos, headers, key UI moments.
- Keep accents (Oxford Blue, Powder Blue, Graphite, Cobalt) to small, high-impact touches.
- Cloud White and Pure White carry most background space. Avoid heavy color blocking.
- Logo: navy mark on light backgrounds, white mark on dark or photo backgrounds. Maintain clear
  space equal to the wingspan height on all sides.

## Semantic mapping used by this app

The guide has no status colors. These three are **additions**, chosen to sit quietly next to the
navy palette rather than shout. Change them if the chapter picks its own.

| Token | Hex |
|---|---|
| Success | `#15803D` |
| Warning | `#B45309` |
| Danger | `#B91C1C` |

## Logo

The brand guide PDF ships with the **old** mark (filename literally reads
`NEEDNEWLOGOONTHIS`). The current mark is the navy eagle with the ΣΗΠ lockup.

**Action required:** export the eagle mark as SVG and place both variants at:

```
public/logo/eagle-navy.svg    # for light backgrounds
public/logo/eagle-white.svg   # for dark backgrounds and email
```

Email templates need a PNG raster too (Gmail does not render SVG):

```
public/logo/eagle-navy-512.png
```
