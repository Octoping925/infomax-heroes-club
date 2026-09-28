# Heroes Profile tier page verification — 2026-09-28

## Daily snapshot implementation

- `npx prisma generate`: passed.
- `npm run lint`: passed.
- `npm run ts:check`: passed.
- `npm run build`: passed. Next.js listed the cron and tier routes, with no `/api/tier/options` route. The build retains an existing dynamic dependency warning in the replay parser.
- Read-only Heroes Profile checks used the local `.env` key without printing it: `/patches` returned 200 and the newest valid major patch was `2.55`; Storm League all-player and `league_tier=4,5,6` statistics each returned 200 with 90 hero rows.
- `git diff --check`: passed.

## Map tier implementation

- `npx prisma generate`: passed after adding independent map snapshot columns.
- Focused Vitest run for grouped map parsing, daily collection, route responses, the selector, and Heroes Profile request params: 25 tests passed.
- The map collector adds one grouped request per audience (two extra requests daily total); visitor requests continue to read Postgres only.
- The live grouped map endpoint returned 429 during implementation, so map response behavior was verified against the official response contract and deterministic fixtures without retrying the vendor call.
- Map migration `20260928180000_hero_meta_map_snapshots` has been applied to the configured Postgres database; `npx prisma migrate status` reports the schema is up to date.
- `npm test`: passed, 241 tests across 48 files after switching to major subpatches. `npm run lint`, `npm run ts:check`, `npx prisma validate`, and `git diff --check`: passed.
- `npm run build`: passed after granting the build read access to the configured DB; `/stats` prerendered. Existing warnings remain for the replay parser's dynamic dependency and chart dimensions during static rendering.
- A manual invocation of the cron handler selected subpatch `2.55.17`. Both all-map audiences stored 90 hero rows. Both grouped-map requests returned HTTP 429, so their previous snapshots were retained for the next daily run.
- Collection is split into `/api/cron/hero-meta` for all-map data and `/api/cron/hero-meta/maps` for grouped maps, scheduled 15 minutes apart. The two jobs use independent daily run dates and leases. Migration `20260928220000_hero_meta_separate_cron_locks` is applied; `npx prisma migrate status` reports up to date.
- Overall and grouped-map collection are now separate scheduled routes, each with independent run dates and leases. The grouped-map route runs 15 minutes after the overall route and its job handler calls only the grouped-map source.

## Database and browser checks

- Both daily snapshot migrations are applied to the configured Postgres database. The page still needs the next successful cron collection before map snapshots appear in its selector.
- A populated `/tier` browser check and screenshots were not captured because the new columns and snapshots are not present in that database. After migration and the first cron run, check `/tier` at 1280 px and 390 px, switch between both league classifications, verify the displayed patch and refresh time, and confirm `/stats#scrimStats` still renders.
- Configure `HEROES_PROFILE_API_KEY` and `CRON_SECRET` in Vercel Production. Confirm the first run stores all-map and grouped map results for both audiences, then verify repeated page loads do not call Heroes Profile.
- Confirm the Heroes Profile plan permits public display and storage of collected statistics before release.
