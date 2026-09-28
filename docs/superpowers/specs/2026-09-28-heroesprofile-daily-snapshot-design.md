# Heroes Profile daily tier snapshots

## Goal

`/tier` shows the latest stored Heroes Profile hero statistics without contacting Heroes Profile during a visitor request. A Vercel cron refreshes the stored statistics once per day.

## Public page

- Keep the public `/tier` page and the shared `HeroTierTable` component used by `/stats`.
- Show Storm League only. The player league selector has exactly `전체` and `상위 티어 (플래티넘 이상)`; the latter combines league IDs 4, 5, and 6. Keep role, hero search, and sorting as local display controls.
- Assume all regions and all maps for both stored datasets. Remove the mode, region, map, and patch selectors, including the patch-options request. The latest major patch is selected by the daily collector and shown as context, not as a selector.
- Show the last successful refresh time and Heroes Profile attribution. If no snapshot exists, show `데이터 준비 중`. If a refresh fails, continue showing the last successful snapshot and its timestamp.
- Keep the existing role-relative S–D calculation, 100-game minimum, source distinction, and link to the club's `/stats` tiers.

## Collection and storage

- One protected Vercel cron invocation per day, proposed at 06:00 KST (`0 21 * * *` UTC), collects the current major patch for Storm League across all regions and maps.
- Request two `/heroes/stats` datasets: no `league_tier` for `전체`, and `league_tier=4,5,6` for `상위 티어`. Do not query earlier patches or store a history of snapshots. Keep only the current successful dataset per audience.
- The collector uses the server-only `HEROES_PROFILE_API_KEY` already present in local `.env`; deployment must also configure it server-side. Protect the cron route with `CRON_SECRET` and never return or log either secret.
- A 202 response is handled by the collector: persist the validated job path, wait at least `Retry-After`, and poll until 200 or the invocation's bounded deadline. A job still pending at the deadline is resumed by the next daily invocation. Visitors never poll Heroes Profile or advance its jobs.
- Publish a dataset only after parsing and validating the complete response. An unsuccessful or empty response must not erase the last good dataset. Store the patch and successful refresh time with each audience. Guard duplicate cron deliveries with a database claim and daily run marker.
- The public tier endpoint reads Postgres only. It does not depend on the external API key or the vendor's availability.

## Verification and constraints

- Live reads with the local key confirmed `/patches` returns `game_version` rows and that both Storm League audience queries return 200 with 90 heroes. Confirm 202 handling through the collector and confirm plan permission for public redisplay and stored snapshots before release. Never print or commit the key.
- Confirm the deployed Vercel project's function duration supports the chosen polling deadline. Vercel cron does not retry failed invocations, so monitor failures and stale snapshot age.
- Verify that every public request stays DB-only, the daily run makes only the intended two statistic queries, duplicates do not repeat them, and a timeout or vendor error preserves current data.

Sources: [Heroes Profile v1 migration](https://www.heroesprofile.com/Api/Migrating), [Heroes Profile API specification](https://github.com/Heroes-Profile/heroesprofile/blob/develop/config/api_spec.php), [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).
