# Heroes Profile hero tier page

## Goal

Provide a public `/tier` page for the global Heroes of the Storm meta. The page uses Heroes Profile statistics and labels its S–D grades as this site's own calculation. It links to the existing club scrim tier table while keeping the two sources clearly separate.

## Scope and defaults

- Default filters: Storm League, all regions, latest major patch, all maps, all player league tiers.
- Filters: game mode (Storm League, Quick Match, ARAM), region, patch, map, player league tier, and role. Map and league tier can be combined.
- Every data filter except role and hero search requests a separately calculated tier list. Role and hero search only change the rows shown.
- Rows show portrait, Korean hero name, club role, derived grade, win rate, pick rate, ban rate when available, games played, and tier score. Users can search heroes and sort by grade, win rate, or pick rate. Selecting a hero shows metrics and a short grade explanation.
- Show source attribution, calculation method, last successful refresh, and a link to `/stats#scrimStats`.

## Grading

- Map Heroes Profile hero names to the existing local hero catalog and five local roles. Unknown heroes are logged and omitted until mapped; known rows remain visible.
- A hero with fewer than 100 games in the selected data conditions is shown as `표본 부족`, without a grade.
- Use the existing conservative win-rate utility for the win component. Within each role, normalize the conservative win rate, pick rate, and ban rate to percentile ranks. Score = 70% win + 20% pick + 10% ban; when ban data is unavailable, renormalize the remaining weights.
- Rank eligible heroes within each role. S: top about 10%; A: next 20%; B: middle 40%; C: next 20%; D: bottom 10%. If fewer than five eligible heroes exist in a role, withhold grades for that role. Tie-breaking is deterministic by hero name.
- The numeric weights and five-hero role minimum are proposed initial parameters; inspect real API data before release and adjust only with a documented change.

## Integration and persistence

- Use the Heroes Profile external v1 API with `Authorization: Bearer` in server code only. Obtain options from `/patches` and `/maps`; obtain statistics from `/heroes/stats`.
- Store a normalized snapshot for each canonical set of data filters in Postgres. A snapshot expires after 24 hours. On a stale request, return the last successful snapshot while refreshing it.
- A cold Heroes Profile request can return HTTP 202 with `Location` and `Retry-After`. Persist the job location and let the UI poll this site's endpoint until it is ready. Never expose the external key or arbitrary job URL to clients. Accept only same-origin v1 job paths.
- Distinguish pending, stale, unavailable-key, permission, rate-limit, upstream error, no-data, and valid data states. Keep existing snapshots during transient failures.
- Cache reference options for a day. Canonicalize and validate every public filter against known values before calling the external API.

## Constraints and verification

- No Heroes Profile key exists yet. The UI must explain that live data will appear after the key and authorized plan are configured. The integration must be tested with real data after purchase.
- Confirm the paid plan permits serving a public website and storing/re-displaying snapshots before launch. Review the current terms and quotas; legacy API prices and quotas do not apply to v1.
- Reuse the current scrim tier table's visual component by extracting a shared table renderer. Preserve the current scrim labels, honey-pick badge, filters, and behavior.
- Test scoring, data normalization, query validation, stale/pending/error transitions, and no-key behavior with mocked data. Run lint, TypeScript checks, tests, and build. Manually verify desktop/mobile `/tier` and existing `/stats` and capture screenshots.

Sources: [v1 migration](https://www.heroesprofile.com/Api/Migrating), [official API specification](https://github.com/Heroes-Profile/heroesprofile/blob/develop/config/api_spec.php).
