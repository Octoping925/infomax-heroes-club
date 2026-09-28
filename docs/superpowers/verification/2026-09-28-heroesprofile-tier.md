# Heroes Profile tier page verification — 2026-09-28

## Daily snapshot implementation

- `npx prisma generate`: passed.
- `npm run lint`: passed.
- `npm run ts:check`: passed.
- `npm run build`: passed. Next.js listed `/api/cron/hero-meta` and `/api/tier/heroes`, with no `/api/tier/options` route. The build retains an existing dynamic dependency warning in the replay parser.
- Read-only Heroes Profile checks used the local `.env` key without printing it: `/patches` returned 200 and the newest valid major patch was `2.55`; Storm League all-player and `league_tier=4,5,6` statistics each returned 200 with 90 hero rows.
- `git diff --check`: passed.

## Map tier implementation

- `npx prisma generate`: passed after adding independent map snapshot columns.
- Focused Vitest run for grouped map parsing, daily collection, route responses, the selector, and Heroes Profile request params: 25 tests passed.
- The map collector adds one grouped request per audience (two extra requests daily total); visitor requests continue to read Postgres only.
- The live grouped map endpoint returned 429 during implementation, so map response behavior was verified against the official response contract and deterministic fixtures without retrying the vendor call.
- Map migration: `20260928180000_hero_meta_map_snapshots`; it has not been applied to the remote database.
- `npm test`: passed, 237 tests across 48 files. `npm run lint`, `npm run ts:check`, `npx prisma validate`, and `git diff --check`: passed.
- The map implementation production build compiled and passed TypeScript, but Next.js could not prerender the existing `/stats` page because `db.prisma.io` was unreachable (Prisma P1001). The map routes compiled successfully.

## Database and browser checks

- The migrations `20260928120000_hero_meta_daily_snapshots` and `20260928180000_hero_meta_map_snapshots` are present but have not been applied. The configured `DATABASE_URL` points to a remote Prisma database, so migrations need to be applied in the intended deployment environment.
- A populated `/tier` browser check and screenshots were not captured because the new columns and snapshots are not present in that database. After migration and the first cron run, check `/tier` at 1280 px and 390 px, switch between both league classifications, verify the displayed patch and refresh time, and confirm `/stats#scrimStats` still renders.
- Configure `HEROES_PROFILE_API_KEY` and `CRON_SECRET` in Vercel Production. Confirm the first run stores all-map and grouped map results for both audiences, then verify repeated page loads do not call Heroes Profile.
- Confirm the Heroes Profile plan permits public display and storage of collected statistics before release.
