# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **current members** of the 연합인포맥스 (Yonhap Infomax) Heroes of the Storm club: coworkers who play in-house scrims (내전), mostly over lunch. They come to the site after a match to look up results, win rates, rivalries, hero and map stats, and the current meta tier. One or more admins enter match data.

Prospective members and newcomers are a secondary audience. These are Infomax coworkers, often League of Legends players who are new to HotS, and they arrive through the landing page, guide, and glossary.

## Product Purpose

The site is the club's home and its record. It keeps every in-house match on file so members can review games with numbers instead of gut feel: who wins with whom, against whom, on which map, with which heroes and talents. It also gives newcomers enough context to join conversations and games.

The site succeeds when members actually open it after a scrim, the stats give them something to talk about, and newcomers can follow along.

## Positioning

The data covers this club's own in-house games, not public ladder data. Rivalries, fantasy duos, team composer, personal form, and highlights are all computed from the club's own matches. Public meta (Heroes Profile tiers) is a supporting layer, not the core.

## Operating Context

- Scrims are played over lunch roughly twice a month. Monthly offline dinners are recorded in the gallery.
- Members use a mix of devices: work desktops for stats and admin input, phones for quick checks, often from links shared in Dooray, the company messenger.
- Dooray slash commands and bot endpoints (`/api/pick-map`, `/api/hots-tip`, tier) bring parts of the site into chat.
- Admins import matches by uploading replays (`.StormReplay` parse → confirm) and add bans, talents, stats, highlights, and video.
- Vercel crons refresh hero meta snapshots daily.

## Capabilities and Constraints

- Routes: landing `/`, `/stats` (scrim, personal, map, team composer, rivalry), `/tier` (meta tier from Heroes Profile, with 꿀픽 honey picks), `/guide` (+ `/guide/combination`), `/glossary`, `/gallery`, `/match-history`, `/admin` (password-gated: match input, replay import, strategy report).
- Stack: Next.js App Router, React 19, Tailwind 4, Recharts, TanStack Query, Prisma/Postgres, deployed on Vercel.
- Language is Korean (`lang="ko"`). Hero and map names may appear in English or Korean.
- Game art (heroes, maps, talents) comes from Blizzard's Heroes of the Storm and is used as-is for an internal hobby club.

## Brand Commitments

- Name: 연합인포맥스 히오스 동호회 / "Infomax Heroes Club".
- Voice: friendly club banter. Warm and a little playful (rivalries, 꿀픽, fantasy duos, inside jokes between coworkers), but still fine to open at work. Avoid loud esports hype and stiff corporate tone.

## Evidence on Hand

- Real match data in Postgres (Player, Match, Game, bans, talents, highlights, hero meta snapshots).
- Club photos: `public/album/` (44 images from offline meetups).
- Game art: `public/heroes/`, `public/maps/`, `public/talents/`.
- Long-form guides: `docs/hots-beginner-guide-for-lol-players.md`, `docs/hots-beginner-guide-combination.md`.
- Landing-page facts already in use: 13+ active members, lunch scrims twice a month, a permanent match archive. Do not invent other member counts, testimonials, or achievements.

## Product Principles

1. **Members after the match come first.** The data pages are the product. Optimize for "what happened, and who's on form" over marketing.
2. **Back opinions with records.** Every claim the site makes about a player, hero, or map should trace back to recorded matches.
3. **Make banter possible.** Rivalries, duos, and rankings exist so members have something fun to talk about. Keep them friendly, not humiliating.
4. **Make room for newcomers.** Guides and the glossary should let a LoL player follow the conversation without asking.
5. **Work on both screens.** Every data view has to work on a work desktop and on a phone opened from a chat link.
