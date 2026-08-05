## Infomax Heroes Club

연합인포맥스 임직원을 위한 히어로즈 오브 더 스톰(Heroes of the Storm) 동호회
랜드딩/통계/관리 페이지를 제공하는 커뮤니티 사이트입니다. 동호회 소개,
활동 안내, 참여 유도 콘텐츠와 함께 `/stats`, `/admin` 관련 대시보드 및
API 핸들러를 통해 운영 데이터를 관리합니다.

### Highlights

- 동호회 소개와 주요 활동을 보여주는 랜딩 페이지
- `/stats` 통계 대시보드, `/admin` 운영 페이지
- Prisma/Postgres + MongoDB 헬퍼를 사용하는 데이터 계층
- Next.js App Router 기반 구조와 컴포넌트 분리

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the landing page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

- `app/`: App Router routes, layouts, API handlers (`/`, `/stats`, `/admin`)
- `components/`: shared UI components
- `domain/hots/`: game-specific models, repositories, services, utils
- `config/`: infrastructure helpers (MongoDB, etc.)
- `prisma/`: schema and migrations (client at `generated/prisma`)
- `public/`: static assets

## Environment

Create `.env.local` with:

```bash
DATABASE_URL=postgres://...
MONGODB_URI=mongodb://...
REPLAY_TOKEN_SECRET=base64url-secret...
```

`REPLAY_TOKEN_SECRET`은 최소 32 random bytes를 padding 없는 base64url로
인코딩한 값이어야 합니다. 로컬에서는 다음처럼 생성할 수 있습니다.

```bash
openssl rand -base64 32 | tr -d '\n=' | tr '+/' '-_'
```

Vercel의 Development, Preview, Production 환경마다 서로 다른 값을 설정하세요.
이 값은 리플레이 검토 초안의 HMAC 서명에만 사용하며 로그나 클라이언트 설정에
넣지 않습니다. 값을 회전하면 기존 초안은 즉시 검증되지 않으므로 리플레이를
다시 파싱해야 합니다.

## Replay import

관리자는 `/admin/match`에서 `.StormReplay` 파일을 최대 10개 선택하고, 파싱된
경기 순서·팀 방향·선수 연결·리더·시간대를 검토한 뒤 한 번에 저장할 수 있습니다.
원본 파일은 브라우저에서 `/api/matches/replays/parse`로 직접 전달되고 서버나 DB에
보관되지 않습니다. 파싱 결과는 30분짜리 HMAC 서명 초안으로 돌아오며, 최종 저장은
`/api/matches/replays/confirm`에서 서명과 모든 검토값을 다시 검증합니다.

Vercel Functions의 [요청/응답 payload 한계는 각각 4.5MB](https://vercel.com/docs/functions/limitations)입니다.
그래서 원본 요청은 4,000,000 bytes, 파싱 응답은 400,000 bytes, 최종 확인 요청은
3,500,000 bytes로 제한해 플랫폼의 불투명한 413보다 애플리케이션 오류가 먼저
응답하도록 했습니다. 두 API는 Node.js runtime과 `maxDuration = 60`을 명시합니다.
함수 번들은 Next.js `outputFileTracingIncludes`로 고정 heroprotocol 파일을 포함하며,
Vercel의 기본 250MB 비압축 함수 한계 아래인지 릴리스 때 확인합니다.

### Local corpus verification

원본 리플레이는 저장소에 복사하지 말고 외부 디렉터리를 그대로 지정합니다.
검증 결과는 빌드·오류 코드·크기·시간 같은 집계값만 출력하며 닉네임, BattleTag,
파일명 또는 raw event를 출력하지 않습니다.

```bash
REPLAY_CORPUS_DIR=/absolute/path/to/repl \
LEGACY_HOTS_DIR=/absolute/path/to/infomax-hots \
npm run verify:replays
```

릴리스 기준은 다음과 같습니다.

- 지원 빌드는 legacy 정규화 결과와 map, winner, date, team, player, stat, talent,
  ban, duration이 일치해야 합니다.
- `INVALID_REPLAY`, `INVALID_TEAM_SIZE`, `WINNER_NOT_FOUND`는 기존 파서가 AI/불완전
  로스터를 통과시키거나 승자를 임의로 1팀으로 만들던 동작을 제거한 의도된 교정입니다.
- 새 게임 빌드는 자동으로 최신 protocol에 폴백하지 않습니다. 대표 리플레이를 corpus에
  추가해 전체 parity를 통과시킨 뒤 `VERIFIED_PROTOCOL_COMPATIBILITY`에 실제 빌드와
  고정 protocol을 명시적으로 추가합니다.
- `.next/server/app/api/matches/replays/parse/route.js.nft.json`이 있으면 검증 스크립트가
  traced function의 비압축 파일 크기도 집계합니다.

### Vercel release checklist

1. `20260805000000_add_game_source_replay_hash` migration을 배포 DB에 적용합니다.
2. Preview와 Production에 서로 다른 `REPLAY_TOKEN_SECRET`을 설정하고 재배포합니다.
3. Preview에서 유효한 최신/가장 오래된 빌드, 손상 파일, 중복 저장 재시도, 서로 다른 날짜
   묶음을 확인합니다. 4,000,000-byte 경계에서는 앱 응답 또는 성공이 와야 하며
   `FUNCTION_PAYLOAD_TOO_LARGE`가 먼저 나오면 안 됩니다.
4. Vercel Functions 로그에서 `UNSUPPORTED_BUILD`, 413, 422, 409, 5xx와
   `FUNCTION_INVOCATION_TIMEOUT`을 확인하고 parse duration/error rate/memory를 봅니다.
5. 정상 기준은 지원 파일 parse 200, confirm 200, 같은 요청 재시도 시 동일 match ID와
   `alreadyImported: true`, 함수 60초 미만, payload·bundle 예산 이내입니다.

장애 시 먼저 `/admin/match`의 리플레이 진입을 이전 JSON fallback으로 되돌리고 API
route를 롤백합니다. 두 DB 컬럼은 nullable/additive라 이전 코드가 그대로 동작하며,
롤백 중 컬럼 삭제는 하지 않습니다. 파일이 4MB를 자주 넘거나 Vercel 413 비율이
1% 이상 지속되면 함수 한계를 늘리는 대신 Vercel Blob 같은 object storage로 직접
업로드하고 서명 URL만 함수에 전달하는 2단계 구조로 전환합니다.
