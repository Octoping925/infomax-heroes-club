# Heroes Profile Tier Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, filterable hero meta tier page backed by Heroes Profile while reusing the existing scrim tier table UI.

**Architecture:** A server-only API client normalizes Heroes Profile responses. A Postgres snapshot per canonical filter combination preserves the previous result and tracks async jobs. A shared table renders both club and external tiers, with each page retaining its own filters and labels.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/Postgres, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-28-heroesprofile-tier-design.md`

## Global Constraints

- Keep `HEROES_PROFILE_API_KEY` server-only; never include it in responses or logs.
- Preserve the existing `/stats` tier behavior and visual table styling.
- Use the v1 API base `https://www.heroesprofile.com/api/external/v1`.
- Snapshot freshness is 24 hours; low sample cutoff is 100 games.
- Grades are role-relative: S/A/B/C/D bands are approximately 10/20/40/20/10, with 70/20/10 win/pick/ban weights.
- No live key is available; use mocked API responses and report the live verification gap.

## Review Focus

1. Unknown or punctuated vendor hero names must not crash the whole page; test aliases and unknown rows in Task 2.
2. An invalid query must not trigger an upstream call; test values and combinations in Task 2.
3. A 202 job must be polled at or after `Retry-After` and must never accept an arbitrary external URL; test in Task 3.
4. Concurrent requests for a stale key must not consume duplicate API calls; test claim behavior in Task 3.
5. A stale snapshot must remain readable when an upstream request fails; test in Task 3.

---

### Task 1: Share the tier table UI

**Files:** Modify `app/stats/components/scrim-stat/HeroTierList.tsx`; create `components/HeroTierTable.tsx`.

**Interfaces:** `HeroTierTable` accepts rows with hero, rank, badge, win/pick/ban display, and score, plus optional role and row-selection behavior. The scrim component maps its existing API response to this interface.

- [ ] Extract the existing image/name, role, metric cells, and responsive table styling into `HeroTierTable`.
- [ ] Keep scrim-only minimum-pick control, honey icon, OP/1–5 badges, and data fetching in `HeroTierList`.
- [ ] Verify `/stats` table output and filtering are unchanged with lint and a manual browser check.

### Task 2: Normalize vendor data and grade heroes

**Files:** Create `domain/hots/service/hero-meta-tier.ts`, `domain/hots/service/hero-meta-tier.spec.ts`, and `domain/hots/service/hero-meta-filters.ts`; use `HERO_CATALOG` and existing conservative win-rate helper.

**Interfaces:** `parseHeroStats(raw: unknown): HeroMetaStat[]`; `gradeHeroStats(stats: HeroMetaStat[]): HeroMetaRow[]`; `parseHeroMetaFilters(params: URLSearchParams, options: FilterOptions): HeroMetaFilters`.

- [ ] Write tests for punctuation/diacritics, missing fields, unknown heroes, 99/100 game cutoff, missing ban rate, role-specific ranking, ties, and fewer than five eligible heroes.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement parser, normalized within-role metrics, conservative win component, and deterministic grade bands.
- [ ] Test invalid mode, region, patch, map, and league tier inputs before any API request.
- [ ] Run targeted tests and TypeScript checks.

### Task 3: Persist snapshots and handle external API jobs

**Files:** Modify `prisma/schema.prisma`; create `prisma/migrations/20260928000000_hero_meta_snapshots/migration.sql`, `config/heroes-profile.ts`, `domain/hots/repositories/hero-meta-snapshot.ts`, `domain/hots/service/hero-meta-loader.ts`, and related `*.spec.ts` files; regenerate `generated/prisma`.

**Interfaces:** `loadHeroMeta(filters: HeroMetaFilters): Promise<HeroMetaResult>` returns rows, fetch time, state, and retry hint; `getHeroMetaOptions(): Promise<FilterOptions>` returns supported patches/maps and fixed mode/region/league choices.

- [ ] Add a unique canonical cache key, normalized stats JSON, fetched timestamp, job path, next poll timestamp, and lease timestamp.
- [ ] Write tests with injected fetch/repository for fresh, stale, cold, 202, 200, 401/403, 429, 500, expired job, invalid job path, and competing refresh attempts.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement server-only Bearer client, job polling, bounded retry, 24-hour freshness, stale-while-refresh, and a database claim for a single refresh per key.
- [ ] Generate Prisma client and run targeted tests and TypeScript checks.

### Task 4: Build the public page and routes

**Files:** Create `app/tier/page.tsx`, `app/tier/TierPageClient.tsx`, `app/api/tier/heroes/route.ts`, `app/api/tier/options/route.ts`; modify `components/TopBar.tsx`; reuse `components/HeroTierTable.tsx`.

**Interfaces:** Options route returns filter choices; heroes route returns `HeroMetaResult` for validated query parameters. The page uses the shared table with S–D badges and a hero detail view.

- [ ] Add server routes with explicit pending, stale, unconfigured, no-data, and upstream-error responses.
- [ ] Build filter controls, hero search, sorting, details, source/calculation/freshness copy, and link to scrim tiers.
- [ ] Poll this site's heroes route only while pending, honoring the retry hint and cancelling when filters change.
- [ ] Add `/tier` to the top navigation and metadata.
- [ ] Verify keyboard controls, narrow-screen scrolling, no-key state, and existing `/stats` UI.

### Task 5: Document and verify release readiness

**Files:** Modify `README.md`; update spec if implementation decisions changed.

- [ ] Document `HEROES_PROFILE_API_KEY`, migration filename, deployment order, cache behavior, and the live API/license checks required after key purchase.
- [ ] Run `npm test`, `npm run lint`, `npm run ts:check`, and `npm run build`; fix any failures caused by this branch.
- [ ] Capture desktop/mobile `/tier` and `/stats` screenshots and record manual verification steps/results.
- [ ] Review the diff for unrelated changes, secrets, and generated Prisma artifacts.
