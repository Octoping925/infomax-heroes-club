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
```
