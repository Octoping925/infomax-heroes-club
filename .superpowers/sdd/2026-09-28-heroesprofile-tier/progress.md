# SDD ledger — plan: docs/superpowers/plans/2026-09-28-heroesprofile-tier.md
Pre-flight: Task 1 shared table props feed Task 4; Task 2 filters and grades feed Task 3 and Task 4; Task 3 result state feeds Task 4. Interfaces align with spec.
Task 1: complete (commits d13291a..44e6d56, tests: npm test -- components/HeroTierTable.spec.ts →    Duration  370ms (transform 41ms, setup 0ms, collect 84ms, tests 8ms, environment 0ms, prepare 37ms))
Task 2: complete (commits 44e6d56..0f65c2e, tests: npm test -- domain/hots/service/hero-meta-tier.spec.ts domain/hots/service/hero-meta-filters.spec.ts →    Duration  348ms (transform 55ms, setup 0ms, collect 87ms, tests 12ms, environment 0ms, prepare 76ms))
Task 3: complete (commits 0f65c2e..12ca744, tests: npm test -- domain/hots/service/hero-meta-loader.spec.ts domain/hots/repositories/hero-meta-snapshot.spec.ts config/heroes-profile.spec.ts →    Duration  395ms (transform 83ms, setup 0ms, collect 173ms, tests 16ms, environment 0ms, prepare 135ms))
Task 4: complete (commits 12ca744..ce52a15, tests: npm test →    Duration  1.80s (transform 1.28s, setup 0ms, collect 3.45s, tests 372ms, environment 5ms, prepare 2.42s))
Task 5: complete (commits ce52a15..a1623f2, tests: npm test →    Duration  2.21s (transform 1.36s, setup 0ms, collect 4.42s, tests 498ms, environment 12ms, prepare 3.53s))

Ruling: Compare the persisted fetchedAt value in the atomic lease claim and reload after a lost claim, so a concurrent request observes the winner's fresh snapshot instead of repeating the upstream call.
Ruling: Persist Retry-After from the response receipt time without truncating valid delays above five minutes.
Ruling: Persist patch/map reference options for a day and serve the last copy during API outages; the stats route reads only persisted references, so invalid filters never call the reference or stats endpoints.
Ruling: Reject incomplete/error API envelopes before rendering the table; preserve ready cached rows even when the API key is temporarily absent.
Ruling: Log at most 20 unmapped hero names per response and show distinct API key, plan access, and quota messages.
Final review: the reviewer found no Critical issues and five Important plus two Minor issues; all in-scope findings were fixed and re-verified. Live API response and paid-plan permission remain release checks because no key is available.
