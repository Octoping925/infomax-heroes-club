# Heroes Profile Map Tier Lists Implementation Plan

> **For agentic workers:** Implement this plan task by task with TDD. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add current per-map hero tier lists to `/tier` while preserving the all-map list.

**Architecture:** The daily collector keeps its two existing overall requests and adds one `group_by_map=true` request per audience. Overall and map results, timestamps, and async jobs are persisted separately on the current snapshot row. Public reads select all-map or one stored map dataset and continue to use the shared `HeroTierTable`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/Postgres, Vercel Cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-heroesprofile-map-tier-design.md`

## Global Constraints

- Keep visitor requests database-only.
- Refresh daily; store only the latest successful dataset per audience/map.
- Preserve the existing overall result, audience filters, score formula, 100-game cutoff, attribution, and shared table.
- Keep `HEROES_PROFILE_API_KEY` and `CRON_SECRET` server-only.
- Add two grouped-map requests per day total; do not issue one request per map.
- Respect asynchronous job paths and `Retry-After`; preserve prior data on failed collection.

## Review Focus

1. A malformed grouped response must not erase a prior complete map set.
2. A pending grouped job must not replace or resume the all-map job path.
3. An unknown Heroes Profile map name must not be assigned to a different local map.
4. A valid map with no stored result must return `pending`, not the overall rows.
5. Switching audience/map quickly must not display a response for the previous selection.

---

### Task 1: Parse grouped map results

**Files:** Modify `domain/hots/service/hero-meta-tier.ts` and its spec; modify `domain/hots/constants/maps.ts` only if a source-name mapping helper belongs there.

**Interfaces:** Export `type HeroMetaMapStats = Partial<Record<GameMap, HeroMetaStat[]>>` and `parseGroupedHeroStats(raw: unknown): HeroMetaMapStats`.

- [ ] Add a failing test with `{ data: { "Alterac Pass": [Yrel row], "Garden of Terror": [Ana row], "Unknown Map": [...] } }`; assert local keys `AlteracPass` and `HauntedWoods`, correctly parsed heroes, and no unknown-map entry.
- [ ] Run `./node_modules/.bin/vitest run domain/hots/service/hero-meta-tier.spec.ts`; confirm the new export is missing.
- [ ] Implement normalized API map-name to `GameMap` mapping. Parse each known map's rows through `parseHeroStats`; skip/log unknown map names.
- [ ] Re-run the focused spec and confirm all tests pass.

### Task 2: Persist and refresh map datasets

**Files:** Modify `prisma/schema.prisma`, `domain/hots/service/hero-meta-daily-refresh.ts`, `domain/hots/repositories/hero-meta-snapshot.ts`, and their specs; add a migration; modify `config/heroes-profile.ts`.

**Interfaces:** Add `fetchMapStats(patch, audience)` to the daily source. Add typed map stats plus map fetch/job metadata to daily snapshots. Add `saveMapReady`, `saveMapPending`, and `saveMapFailure` store operations.

- [ ] Add tests proving overall/map stats and job paths are stored independently, pending map jobs resume, and failed/empty map data preserves prior map stats.
- [ ] Run the focused specs and confirm the map store methods and source method are missing.
- [ ] Add nullable map snapshot/job columns and a migration; extend repository JSON validation for local `GameMap` keys and hero rows.
- [ ] Add the `group_by_map=true` source request and implement map collection under the same daily audience claim, with separate pending job state and the existing bounded `Retry-After` polling behavior.
- [ ] Generate Prisma client and run the focused specs and `npm run ts:check`.

### Task 3: Serve map selection from the database

**Files:** Modify `app/api/tier/heroes/route.ts` and its spec.

**Interfaces:** Extend `GET /api/tier/heroes` with optional `map=<GameMap>`. Return map choices as `{ id, name }[]`; return `map`, `updatedAt`, and graded rows for the requested view. Missing selected-map data returns `pending`; invalid map IDs return 400.

- [ ] Add failing tests for all-map reads, a selected map, map labels, invalid map, missing map snapshot, and the route making no vendor requests.
- [ ] Run the route spec and confirm it fails for the missing map parameter support.
- [ ] Load the daily snapshot once, choose overall or map stats from stored data, grade only the selected dataset, and use its successful refresh timestamp.
- [ ] Run the route spec and type check.

### Task 4: Add map selector to `/tier`

**Files:** Modify `app/tier/TierPageClient.tsx` and its spec; keep `components/HeroTierTable.tsx` unchanged.

**Interfaces:** Add an `ALL_MAPS | GameMap` selection, consume map choices from the existing tier endpoint, and stamp fetched results with the selected audience and map.

- [ ] Add a failing component test for the map selector, localized names, preserving the all-map default, and loading map-specific results on selection.
- [ ] Run the focused component spec and confirm map controls are absent.
- [ ] Add the selector and selection-aware DB fetch. Keep all current role/search/sort/detail/table behavior.
- [ ] Run the component spec, lint, type check, and production build. Inspect a desktop and mobile `/tier` screenshot if the database is available.

### Task 5: Document deployment

**Files:** Modify `README.md` and `docs/superpowers/verification/2026-09-28-heroesprofile-tier.md`.

- [ ] Document the added `group_by_map` requests, their weekly budget, map snapshot migration, and DB-only visitor reads.
- [ ] Run `npm test`, `npm run lint`, `npm run ts:check`, `npm run build`, and `git diff --check`; record outcomes and any existing warnings.
- [ ] Do not apply the migration to a remote database as part of local implementation. Record the production deployment step.
