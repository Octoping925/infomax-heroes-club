# Heroes Profile map tier lists

## Goal

Extend `/tier` so visitors can keep viewing the current all-map tier list or choose a playable map and see that map's hero meta. Preserve the existing audience filters, role/search/sort controls, grade formula, shared table, attribution, and database-only page reads.

## Collection and storage

- Keep the existing daily all-map collection for `all` and `platinum_plus`.
- Add one `group_by_map=true` Heroes Profile `/heroes/stats` request per audience per daily run. The API returns one result set per playable map keyed by map name; the documented call counts once regardless of map count.
- Persist map statistics, successful map refresh time, and map query job state separately from the all-map result. One audience's map job must not overwrite its all-map job or published statistics.
- Store only the latest successful map set per audience. A failed, empty, malformed, or still-pending map refresh preserves the previous map set. Resume pending jobs on the next daily run using the persisted validated job path and `Retry-After`.
- Map keys are the existing `GameMap` catalog keys. Resolve Heroes Profile English map names to the local map catalog and display `nameKo`.
- The public API reads only Postgres and returns available map choices with the selected result. It never calls Heroes Profile.

## Page behavior

- Add a map selector to `/tier`, with `전체 맵` selected by default to preserve the current view.
- Changing map or audience loads only the corresponding stored dataset. Show the selected map's last successful refresh time. If that map has no stored result, show `데이터 준비 중`.
- Calculate role-relative S–D tiers independently for each audience/map result using the existing 100-game minimum and scoring formula.
- Reuse `HeroTierTable` without changing `/stats` behavior.

## API quota and external limits

- Two existing all-map statistics calls plus two grouped-map calls per day means at most four new global statistics requests daily, or 28 per week. API documentation says the lowest Basic plan allows 70 Hero Data calls weekly.
- Grouped-map jobs are asynchronous like other global stats jobs. Map and all-map jobs keep independent retry state and both respect the existing bounded cron deadline.
- Keep the API key and cron secret server-only. A vendor failure does not erase any successful map or all-map snapshot.

## Verification

- Test grouped response parsing, map-name mapping, unknown maps, and empty/malformed groups.
- Test that map collection state is separate from all-map state and that failures preserve prior map data.
- Test database-only API behavior for all-map and one-map selection, invalid map handling, and missing map snapshots.
- Verify the selector, pending state, localized map labels, and shared table in `/tier`.

Sources: [Heroes Profile API specification](https://github.com/Heroes-Profile/heroesprofile/blob/develop/config/api_spec.php), [Heroes Profile API limits](https://www.heroesprofile.com/Api).
