# Heroes Profile tier page verification — 2026-09-28

## Automated checks

- `npm test`: 238 tests passed, including v1 patch/popularity parsing, saved reference fallback, race-safe refresh claims, Retry-After timing, and error-envelope handling.
- `npm run lint`: passed.
- `npm run ts:check`: passed.
- `DATABASE_URL=postgresql://local:local@localhost:5432/local npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run build`: application compilation and TypeScript completed, then `/stats` prerender failed with Prisma `ECONNREFUSED` because the local Postgres instance is unavailable. This route already reads the DB during page render.

## Manual browser checks

- Open `http://localhost:3001/tier` at desktop width (1280 px): heading, source links, navigation, calculation note, and no-key state rendered. Browser capture inspected in the task session.
- Set a 390 px mobile viewport: copy wrapped without clipping, links stayed visible, and the no-key card fit the viewport. Browser capture inspected in the task session.
- Open `/stats#scrimStats`: local Postgres connection refused, so the existing stats page could not render for a visual comparison. The shared table's server-rendered markup tests passed, including scrim-specific cells.
- With an active key and migrated DB, repeat these checks using a populated result: every filter, S–D distribution, 100-game cutoff, detail selection, keyboard navigation, narrow-screen table scrolling, 202 job completion, saved snapshot, and daily refresh.

## External verification pending

No `HEROES_PROFILE_API_KEY` is available yet. The v1 request paths and job behavior were checked against Heroes Profile's official API migration guide and specification, and API responses were mocked in tests. After purchasing access, compare a real response with the parser, verify the plan permits public display and storage, and check the API quota before enabling the page in production.
