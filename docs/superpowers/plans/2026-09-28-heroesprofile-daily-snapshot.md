# Heroes Profile Daily Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh two Storm League meta tier datasets once daily and serve `/tier` entirely from Postgres.

**Architecture:** A protected Vercel cron fetches the latest major patch and the all-player and Platinum+ statistics. The existing snapshot store retains the last good result for each of two fixed keys and records any pending vendor job. Public reads grade stored statistics without calling Heroes Profile.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/Postgres, Vercel Cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-heroesprofile-daily-snapshot-design.md`

## Global Constraints

- Preserve existing uncommitted work, especially `domain/hots/service/hero-meta-loader.ts`; inspect its diff before changing it.
- Keep `HEROES_PROFILE_API_KEY` and `CRON_SECRET` server-only. Local `.env` already defines the API key; never print or commit its value.
- Only two audience keys: `all` and `platinum_plus`. Fixed vendor conditions are Storm League, all regions, all maps, and the latest major patch.
- Preserve the shared `HeroTierTable`, existing grading formula, 100-game minimum, `/stats` behavior, attribution, and cross-page link.
- Cron cadence is once daily. Its internal job polling respects `Retry-After`; unfinished jobs resume on the next scheduled run. Public requests never initiate or poll vendor jobs.

## Review Focus

1. A public page or API request must make zero Heroes Profile calls, even when the DB row is empty or stale. Test in Task 3.
2. A cold `202` job must persist its safe job path and be polled only after `Retry-After`; an unfinished job must survive the invocation deadline. Test in Task 2.
3. A failed, empty, or malformed refresh must retain the previous published snapshot. Test in Task 2.
4. Duplicate Vercel cron delivery must not make duplicate paid statistics requests. Test in Task 2.
5. A new patch must not cause an old pending job to publish statistics under the new patch label. Test in Task 2.

---

### Task 1: Define the two fixed snapshots

**Files:** Modify `prisma/schema.prisma`, `domain/hots/repositories/hero-meta-snapshot.ts`, and `domain/hots/repositories/hero-meta-snapshot.spec.ts`; create a new migration under `prisma/migrations/`; modify `domain/hots/service/hero-meta-filters.ts` and its spec.

**Interfaces:** Export `type HeroMetaAudience = "all" | "platinum_plus"`. `get(audience)` returns the published stats, patch, and `fetchedAt`, plus pending job state. `claimDaily(audience, runDate, leaseUntil)` atomically prevents a duplicate run. `saveReady(audience, patch, stats, fetchedAt)` overwrites only the current snapshot; `savePending(audience, pendingPatch, jobPath, nextPollAt)` stores unfinished work.

- [ ] Write repository tests for two fixed keys, a duplicate daily claim, and preserving an old published snapshot when only pending state changes; run the targeted spec and confirm failure.
- [ ] Add `patch`, `pendingPatch`, and `lastRunDate` to `HeroMetaSnapshot` with a migration. New reads and writes use only `all` and `platinum_plus`; clean up obsolete arbitrary-filter rows and reference-option data after the new reader is deployed.
- [ ] Implement the repository methods and fixed audience type; remove the public patch/map/mode/region filter parser. Run targeted tests and `npm run ts:check`.

### Task 2: Move vendor calls into the daily collector

**Files:** Modify `config/heroes-profile.ts`, `domain/hots/service/hero-meta-loader.ts`, `domain/hots/service/hero-meta-tier.ts`, and their specs; create `app/api/cron/hero-meta/route.ts` and its spec; modify `vercel.json`.

**Interfaces:** `refreshHeroMeta(now, deadline, store, source)` processes both audiences. `source.getLatestMajorPatch()` reads `/patches`; `source.fetchStats(patch, audience)` requests `/heroes/stats` with `game_type=sl`, `timeframe_type=major`, and `league_tier=4,5,6` only for `platinum_plus`. `source.pollJob(jobPath)` follows a validated same-origin v1 job path.

- [ ] With the local key, check the real `/patches` shape and one request for each audience; record only status, response shape, patch, and counts. Confirm paid-plan access and public snapshot reuse terms before release; never log the key.
- [ ] Write failing tests for the real v1 response shape, 200, 202→200, 202 past deadline, `Retry-After`, 404/500 job expiration, 401/403/429, malformed/empty data, duplicate cron delivery, and patch change while a job is pending.
- [ ] Adapt `parseHeroStats` to the verified v1 response shape while retaining the existing hero-name mapping and grading formula. Confirm that an unknown hero does not invalidate known rows.
- [ ] Implement bounded polling inside the cron invocation. Save pending state immediately on 202, respect the header, persist it at the deadline, and resume it the next day. Publish only successfully parsed nonempty data; keep older published data on failure.
- [ ] Secure the route by comparing `Authorization: Bearer <CRON_SECRET>` and reject missing secrets. Add one daily cron entry alongside the existing `/api/hots-tip` entry. Choose `maxDuration` and an internal deadline below the deployed plan's limit; test the cron authorization and idempotency.

### Task 3: Make the public tier page DB-only

**Files:** Modify `app/api/tier/heroes/route.ts`, `app/tier/TierPageClient.tsx`, their specs, and `app/tier/page.tsx` if copy changes; remove `app/api/tier/options/route.ts` and obsolete options service/repository modules with their specs if unused.

**Interfaces:** `GET /api/tier/heroes?audience=all|platinum_plus` returns the stored, graded rows, patch, and last successful refresh time. An absent row returns a `pending`/`데이터 준비 중` result; an invalid audience returns 400. This route imports no vendor client.

- [ ] Write failing route tests that stub the DB and prove both audience values, invalid input, absent data, stale data, and zero vendor calls, including when `HEROES_PROFILE_API_KEY` is unset.
- [ ] Replace the public route's `loadHeroMeta`/options/vendor path with a read-only snapshot lookup and `gradeHeroStats`.
- [ ] Keep only the `전체` and `상위 티어 (플래티넘 이상)` selector. Remove the mode, region, map, patch, and old league selectors, options fetch, and 202/retry polling. Keep role/search/sort, shared table, detail, source/score explanation, patch label, and refresh time.
- [ ] Run targeted tests, check `/tier` at desktop and mobile widths, and confirm `/stats` still renders its shared table.

### Task 4: Document and verify deployment

**Files:** Modify `README.md`; record manual screenshots/steps in `docs/superpowers/verification/`.

- [ ] Document the two fixed datasets, `CRON_SECRET`, server-side API key, 06:00 KST schedule (`0 21 * * *` UTC), pending-job continuation, and the first-run `데이터 준비 중` state.
- [ ] Run `npx prisma generate`, `npm test`, `npm run lint`, `npm run ts:check`, and `npm run build`; inspect outputs and resolve failures attributable to these changes.
- [ ] Apply the new migration to the target DB before enabling the new cron. Configure both secrets in Vercel Production and verify the project's actual duration setting. Vercel cron runs in Production and does not retry failures; check logs and stale snapshot timestamps after the first run.
- [ ] Verify that `/tier` and `/api/tier/heroes` make no external call, that a daily run performs the intended vendor requests, and that failed refreshes retain the prior data. Capture desktop/mobile `/tier` and `/stats` screenshots.
