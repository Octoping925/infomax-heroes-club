# Repository Guidelines

## Project Structure & Module Organization
`app/` contains App Router routes and layouts for the landing page, `/stats`, admin dashboards, and API handlers. Co-locate shared view logic in `components/`. Game-specific services live in `domain/hots/{models,repositories,service,utils}` while infrastructure helpers sit in `config/`. Database schemas and migrations are tracked in `prisma/`, with the generated client stored under `generated/prisma`. Put assets in `public/` and design tokens in `resources/once-ui.config.ts`.

## Build, Test, and Development Commands
- `npm run dev`: Start the hot-reloading Next.js server on port 3000.
- `npm run build`: Produce the production bundle and regenerate the Prisma client.
- `npm run start`: Serve the built output locally to mirror deployment.
- `npm run lint`: Enforce the shared ESLint + Next.js config.
- `npx prisma migrate dev`: Apply migrations in `prisma/migrations` to the `DATABASE_URL` database.
- `npx prisma studio`: Inspect or edit the schema defined in `prisma/schema.prisma` through a UI.

## Coding Style & Naming Conventions
TypeScript runs in `strict` mode (see `tsconfig.json`), so favor explicit interfaces and avoid `any`. Follow the established 2-space indentation, double quotes, and trailing commas shown in `app/page.tsx`. Components are PascalCase modules exporting default functions; hooks and utilities use camelCase. Keep Tailwind strings ordered logically, then run `npm run lint` so `eslint.config.mjs` enforces imports and accessibility rules.

## Testing Guidelines
Automated tests are not wired up yet, so every change must include manual verification notes (steps and screenshots for `/stats` or `/admin`). When you add a runner, colocate `*.spec.ts` files beside each module and expose it as `npm test`. Mock Prisma/Mongo clients or inject repositories so deterministic tests never hit shared databases.

## Commit & Pull Request Guidelines
Git history mixes concise English and Korean subjects (`css fix`, `점심 저녁 승률 개편`). Keep subjects under 72 characters, use the imperative mood, and split unrelated work. PRs must describe intent, link an issue or chat thread, list the commands executed, and attach UI captures for visual changes. Flag database edits explicitly, include the migration filename, and request reviewers responsible for the touched `domain/*` packages.

## Data & Configuration Tips
Create `.env.local` with `DATABASE_URL` for Postgres (Prisma) and `MONGODB_URI` for the helper in `config/mongodb.ts`. `npm install` triggers `postinstall` → `prisma generate`, producing `generated/prisma`; rerun it whenever the schema changes. After editing `prisma/schema.prisma` run `npx prisma migrate dev` and commit both the SQL and generated artifacts. Never store production credentials or ad-hoc seed data outside migrations.
