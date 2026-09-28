# Heroes Profile tier page verification — 2026-09-28

## Daily snapshot implementation

- `npx prisma generate`: passed.
- `npm run lint`: passed.
- `npm run ts:check`: passed.
- `npm run build`: passed. Next.js listed `/api/cron/hero-meta` and `/api/tier/heroes`, with no `/api/tier/options` route. The build retains an existing dynamic dependency warning in the replay parser.
- Read-only Heroes Profile checks used the local `.env` key without printing it: `/patches` returned 200 and the newest valid major patch was `2.55`; Storm League all-player and `league_tier=4,5,6` statistics each returned 200 with 90 hero rows.
- `git diff --check`: passed.

## Database and browser checks

- The migration `20260928120000_hero_meta_daily_snapshots` is present but has not been applied. The configured `DATABASE_URL` points to a remote Prisma database, so the migration needs to be applied in the intended deployment environment.
- A populated `/tier` browser check and screenshots were not captured because the new columns and snapshots are not present in that database. After migration and the first cron run, check `/tier` at 1280 px and 390 px, switch between both league classifications, verify the displayed patch and refresh time, and confirm `/stats#scrimStats` still renders.
- Configure `HEROES_PROFILE_API_KEY` and `CRON_SECRET` in Vercel Production. Confirm the first run stores both audiences and then verify repeated page loads do not call Heroes Profile.
- Confirm the Heroes Profile plan permits public display and storage of collected statistics before release.
