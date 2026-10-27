---
name: 연합인포맥스 히오스 동호회
description: The club's own scrim record, read on a near-black field with cyan selection and rank colour as the only saturated signals.
colors:
  void: "#05070b"
  ground: "#0a0a12"
  ink: "#ffffff"
  ink-soft: "#e5e7eb"
  ink-muted: "#9ca3af"
  panel-fill: "rgba(255, 255, 255, 0.03)"
  control-fill: "rgba(255, 255, 255, 0.05)"
  hairline: "rgba(255, 255, 255, 0.10)"
  row-divider: "rgba(255, 255, 255, 0.06)"
  selection-cyan: "#06b6d4"
  selection-cyan-edge: "#22d3ee"
  focus-cyan: "#67e8f9"
  landing-cyan: "#7de3f2"
  landing-amber: "#f5b971"
  rank-challenger: "#c084fc"
  rank-diamond: "#22d3ee"
  rank-platinum: "#38bdf8"
  rank-gold: "#fbbf24"
  rank-silver: "#94a3b8"
  rank-bronze: "#fb923c"
  win: "#a7f3d0"
  loss: "#fecdd3"
  chart-grid: "#333333"
  chart-axis: "#888888"
  chart-tooltip: "#1a1a2e"
  chart-tooltip-text: "#e0e0e0"
  chart-win: "#22c55e"
  chart-loss: "#ef4444"
  chart-games: "#7b2ff7"
typography:
  headline:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  micro:
    fontFamily: "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  panel: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  panel:
    backgroundColor: "{colors.panel-fill}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
  segment-track:
    backgroundColor: "{colors.control-fill}"
    rounded: "{rounded.lg}"
    padding: "4px"
  segment-primary-selected:
    backgroundColor: "{colors.selection-cyan}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  segment-unselected:
    textColor: "#d1d5db"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  segment-in-surface-selected:
    backgroundColor: "rgba(6, 182, 212, 0.20)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 0"
  filter-chip:
    textColor: "#d1d5db"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  filter-chip-active:
    backgroundColor: "rgba(103, 232, 249, 0.15)"
    textColor: "#cffafe"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  select:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  rank-badge:
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  rank-rail:
    width: "6px"
  stats-year-selected:
    backgroundColor: "{colors.selection-cyan}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: 연합인포맥스 히오스 동호회

## Overview

**Creative North Star: "The Clubhouse Scoreboard"**

A near-black field where numbers do the talking. The data surfaces (/stats, match history, admin) sit on a deep blue-black ground with translucent white hairlines and whisper-thin panel fills; colour is held back so that the two things that carry meaning, the cyan of "you are here" and the rank colour of a player's standing, read instantly. Density is high but calm: small type, tabular numerals, rows separated by faint dividers rather than boxes.

The landing page is the one place the world turns atmospheric: radial cyan and amber glows, a faint grid, drifting hero media. That atmosphere stays on the landing; data surfaces are flat.

**Key Characteristics:**
- Deep blue-black ground, white text, gray-400 for everything secondary.
- Translucent white for every surface, border and divider; no opaque grays.
- Cyan primarily marks selection and focus; the diamond rank and existing form-trend chart also use it.
- Rank colour lives in a 6px left rail and a tinted pill badge, never in row backgrounds.
- Tabular numerals in every table body.

## Colors

A monochrome dark system with one interaction hue (cyan) and one categorical scale (rank colours), all from the Tailwind 4 palette except the ground values.

### Primary
- **Selection Cyan** (`selection-cyan`): solid fill with black text in the TopBar and the selected /stats year. Its lighter edge (`selection-cyan-edge`) marks active underline tabs and the border of tinted in-surface selections; `focus-cyan` is the focus outline and focused-input border.

### Secondary
- **Landing Cyan and Landing Amber** (`landing-cyan`, `landing-amber`): the globals.css `--primary` / `--secondary` pair. Used only by the landing atmosphere (radial glows, orbs, text selection tint). Data surfaces do not consume them.

### Tertiary
- **Rank Ladder** (`rank-challenger` through `rank-bronze`): one colour per scrim rank (purple, cyan, sky, amber, slate, orange; the 400 step for rails, 200 text on a 500/15 fill with a 400/40 border for badges). Source of truth is `TIER_RULES` in `app/stats/hooks/useScrimWinRateTier.ts`.
- **Win / Loss** (`win`, `loss`): emerald-200 and rose-200 for a win rate at or above / below 50%. Pale, never saturated.
- **Existing chart colours** (`chart-win`, `chart-loss`, `chart-games`): personal and map bar charts currently use saturated green and red for win rate and purple for game count. These are observed implementation exceptions to the restrained data-surface rule, not a general-purpose state palette.

### Neutral
- **Void** (`void`): body background and landing base (`--background`).
- **Ground** (`ground`): page background of /stats and the app pages, the TopBar's 90%-opacity backdrop, and the fill of native selects.
- **Ink** (`ink`), **Ink Soft** (`ink-soft`), **Ink Muted** (`ink-muted`): primary text and numbers; secondary figures (pick rate, ban rate); headers, units, captions and every explanatory line.
- **Panel Fill / Control Fill** (`panel-fill`, `control-fill`): white at 3% for panels, 5% for segment tracks and hover rows.
- **Hairline / Row Divider** (`hairline`, `row-divider`): white at 10% for panel borders and nav rules; white at 6% between table rows and above panel footnotes.
- **Existing chart neutrals** (`chart-grid`, `chart-axis`, `chart-tooltip`, `chart-tooltip-text`): shared literal values currently used by Recharts grids, axes and tooltips. They are implementation exceptions to the translucent surface rule.

### Named Rules
**The Two Signals Rule.** For new data-surface controls, reserve saturated colour for selection cyan and the rank ladder. Existing charts use additional data colours as documented above.

**The Translucent Surface Rule.** Surfaces, borders and dividers are white at 3/5/6/10/15%, never a new opaque gray hex.

## Typography

**Body Font:** Pretendard Variable (local, weights 45 to 920), falling back to Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic.
**Label/Mono Font:** Geist Mono stack is declared (`--font-mono`) but not used on /stats.

**Character:** One Korean-first sans across every role; hierarchy comes from weight and size, not from a second face.

### Hierarchy
- **Headline** (700, 20–24px): the /stats view title; the page introduction is 24px, increasing to 30px at sm. The TopBar site title scales from 16px to 20px.
- **Title** (700, 16px): panel headings ("선수 순위", "동호회 메타").
- **Body** (400 to 600, 14px): table cells, names (600), buttons. The player score is set like a win rate (600, body size, ink soft); rank, not score, is what a standings row emphasises.
- **Label** (500, 12px): table headers, sub-lines (nickname, record, sample size), counts, footnotes, chip text (600).
- **Micro** (600, 11px): rank badges and rank-band header rows on small screens.

On desktop (`lg`, 1024px and up) the scrim tab steps every role up once: title 18px, body 16px, label 14px. Rank badges and band header rows jump two steps to 14px, so the rank reads before the numbers.

### Named Rules
**The Tabular Rule.** Every table body sets `tabular-nums`; numbers are right-aligned with their unit in muted 12px after the figure.

## Layout

Content is centred in a 1280px max container (`max-w-7xl`) under a sticky TopBar (`max-w-6xl`). The /stats shell has a page introduction followed by category navigation and the active view. At lg (1024px) and up, the category navigation occupies a 180px left column; below lg it becomes a horizontally scrollable row above the view. Sub-tabs remain a horizontal scrollable row. Spacing steps by 4px: 4px between segments, 8px inside cells and chips, 12px panel padding and row gaps, 16px panel side padding on sm and up, 24px between panels.

The scrim tab is the reference for paired data: at lg (1024px) and up, two panels side by side at 3fr/2fr; below lg, one panel at a time behind a two-button segment switch. Table cells tighten from 8px to 4px side padding below sm (640px), and secondary columns (rank column, W-L record) drop out rather than wrap.

Personal hero charts stack below sm (640px), then share two equal columns. The personal summary stacks below md (768px) and becomes a row above it. Year and view switches have a 44px minimum touch height; the mobile scrim panel switch uses the same minimum.

## Elevation & Depth

Data panels are flat. Depth is tonal: a 3%-white panel on the ground, a 5%-white track under segments, 5%-white on row hover. The sticky TopBar uses a 90%-opacity ground and backdrop blur; its selected link currently has a cyan shadow. Glows and gradients are otherwise part of the landing-page atmosphere.

### Named Rules
**The Flat Data Rule.** Panels, tables and controls on data surfaces carry no shadow and no gradient; separate them with a hairline or a fill step.

## Shapes

Soft, consistent corners scaled to element size: 14px panels (16px on older /stats filter panels), 12px segment tracks, 8px segments and nav links, 6px selects and hero portraits, full pills for chips and rank badges. Borders are 1px translucent white. The rank rail is the one hard-edged shape: a 6px full-height colour bar on a row's left edge, no radius.

## Components

### Buttons (segment switches)
- **Shape:** 8px segments inside a 12px track with 4px padding on 5%-white.
- **Shell primary:** selected is solid selection cyan with black text, 14px medium; unselected is gray-300 text, hover 10%-white fill and white text.
- **In-surface switch:** selected is cyan at 20% with a cyan-400 border and white text; unselected is transparent with gray-400 text. Used for the mobile scrim panel switch. The /stats year filter uses a solid cyan selected button with black text.
- **Focus:** 2px cyan-300 outline, 2px offset.

### Chips (filters)
- **Style:** full pill, 1px white/15 border, gray-300 12px semibold, hover 10%-white fill.
- **Active:** cyan-300 at 15% fill, cyan-300/80 border, cyan-100 text, with `aria-pressed`.
- Horizontal chip rows scroll with a hidden scrollbar rather than wrapping.

### Cards / Containers (panels)
- **Corner Style:** 14px.
- **Background:** white at 3% on the ground.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px white at 10%.
- **Internal Padding:** 12px vertical, 8px to 16px horizontal. Heading row is title left, muted count or control right. Footnotes sit under a 6% divider in 12px gray-400.
- No nested cards: rows inside a panel are table rows, not boxes.

### Inputs / Fields
- **Select:** native select, ground fill, 1px white/15 border, 6px radius, 14px white text; focus shifts the border to cyan-300.

### Navigation
- **TopBar:** sticky, ground at 90% with backdrop blur, bottom hairline; links are 8px-radius pills using the shell primary segment states.
- **/stats categories:** a 180px vertical navigation at lg and above; the selected category has a 10%-white background. Below lg, categories form a horizontal row with a cyan underline on the selected item.
- **/stats tabs:** a second horizontal row with a 2px cyan-400 bottom border and white semibold text when active; inactive labels are gray-400. The row scrolls horizontally as needed.

### Data Table
- Header 12px medium gray-400; rows separated by a 6% top border; clickable rows hover to 5%-white and carry a real button on the name for keyboard access.
- Primary figure on top (14px semibold, gray-100), context under it (12px gray-400: record and sample size).

### Rank Rail (signature)
A 6px column on the left edge of each standings row filled with the row's rank colour. Each rank band opens with an 11px (14px on desktop) gray-400 header row (rank name and threshold) that carries the rail too, so the ladder is continuous even for empty bands. The rank badge (micro pill in the rank tint) repeats the rank in text.

## Do's and Don'ts

### Do:
- **Do** build data surfaces from the ground, a 3%-white panel, 10%-white hairlines and 6%-white row dividers.
- **Do** use solid selection cyan with black text for TopBar selection and the /stats year filter; use the 20% cyan tint for the mobile scrim panel switch.
- **Do** take rank colours from `TIER_RULES` and show them as a rail plus badge.
- **Do** set table numbers in tabular numerals, right-aligned, with muted units and sample size.
- **Do** give every interactive control a 2px cyan-300 focus outline and `aria-pressed` on toggles.

### Don't:
- **Don't** add gradients, glows or drop shadows to panels, tables or controls on data surfaces; that atmosphere belongs to the landing page.
- **Don't** introduce new opaque gray or navy hex backgrounds; use the ground or a white opacity step.
- **Don't** fill table rows or cells with rank or position colour; colour belongs in the rail, badge or chip.
- **Don't** nest bordered cards inside panels.
