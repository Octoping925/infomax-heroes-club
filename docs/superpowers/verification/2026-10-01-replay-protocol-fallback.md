# Replay protocol fallback verification

- Changed the missing-build regression test first: builds 1 and 99999 failed with `UNSUPPORTED_BUILD` before implementation, then passed using bundled protocol 94786 while preserving the original replay build.
- `npm test`: replay tests passed; 267 passed, 3 failed overall. Unrelated failures: `domain/hots/service/hero-meta-tier.spec.ts` (grade labels) and `app/tier/select-visible-rows.spec.ts` (grade labels and ordering).
- `npx eslint domain/hots/replay/parser/parser.ts domain/hots/replay/parser/parser.spec.ts`: passed.
- `npm run lint`: blocked by the existing forbidden `require()` import in `util-script/img.js:94`.
- `npm run ts:check`: blocked by `Xalatath` missing from the generated Prisma Hero enum in bans, stats, match creation, and normalized-match persistence.
- `git diff --check`: passed.

Manual verification procedure: open `/admin/match`, upload a replay whose base build has no bundled protocol or compatibility mapping, and confirm a valid replay reaches the review screen with its original build. Repeat with a supported replay and a corrupt file; supported uploads should still parse and corrupt uploads should still fail validation. Capture the review and error screens.

Actual replay upload and screenshots were not verified: no `.StormReplay` fixture is available in this checkout. Automated coverage uses synthetic headers decoded by the real bundled protocol modules; full replay compatibility requires the external corpus.
