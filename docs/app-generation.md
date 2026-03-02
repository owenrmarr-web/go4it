# App Generation

How AI app generation works: Claude Code CLI, playbook, template, build validation, iteration, preview, publishing.

---

## Initial Generation

1. User types prompt on `/create` (must be logged in, must have username)
2. `POST /api/generate` creates a `GeneratedApp` record and spawns Claude Code CLI
3. Starter template (`playbook/template/`) copied into `apps/{generationId}/`
4. `npm install` started in parallel with CLI (saves ~60s)
5. CLI flags: `-p`, `--output-format stream-json`, `--verbose`, `--dangerously-skip-permissions`, `--model sonnet`
6. Progress parsed from stream-json via `[GO4IT:STAGE:...]` markers (defined in playbook)
7. SSE endpoint (`/api/generate/[id]/stream`) streams progress to frontend (DB fallback for HMR)
8. On completion: metadata extracted, parallel install awaited, incremental `npm install` + `prisma db push` + seed
9. **Build validation + auto-fix:** `npm run build` catches TS/build errors. On failure, error fed back to CLI via `--continue`. Up to 2 auto-fix attempts.
10. Generated apps are self-contained: Next.js 16, Tailwind CSS 4, Prisma 6 + SQLite, Dockerfile included

## Iteration / Refine

1. User enters follow-up prompt on refine screen
2. `POST /api/generate/[id]/iterate` creates `AppIteration` record, spawns CLI with `--continue`
3. CLI resumes in same workspace directory, preserving context
4. Same SSE streaming + progress tracking. `iterationCount` incremented.

## Live Preview (legacy, local dev only)

1. `POST /api/generate/[id]/preview` calls `src/lib/previewer.ts`
2. Patches `src/auth.ts` for fake session when `PREVIEW_MODE=true`
3. Spawns `npx next dev -p <port>` with `PREVIEW_MODE=true`
4. `DELETE /api/generate/[id]/preview` kills the process
5. Ports start at 4001, auto-increment. In-memory only.

## Publishing

1. `POST /api/generate/[id]/publish` creates `App` record in marketplace
2. App appears in grid, linked to GeneratedApp via `generatedAppId`
3. `GeneratedApp.title` synced to match published `App.title`

## Global Progress Tracking

- `GenerationContext` (`src/components/GenerationContext.tsx`) manages single SSE connection per generation
- State persisted to localStorage — survives page navigation
- Compact progress chip in Header links to `/create?gen={id}`

## Versioning & Drafts

- Published apps have stable store preview (`App.previewFlyAppId`)
- Creators iterate on drafts (`GeneratedApp.previewFly*`) without affecting store listing
- On publish: draft promotes to store, old store machine destroyed
- Draft previews expire after 7 days with warning badges

## Environment

- `ANTHROPIC_API_KEY` must be set (separate from Claude subscription — needs API credits at console.anthropic.com)
- In production, routes delegate to builder service when `BUILDER_URL` is set

## Key Files

- `src/lib/generator.ts` — CLI spawning, progress parsing, parallel npm install
- `src/lib/previewer.ts` — Legacy local dev preview
- `src/app/create/page.tsx` — Create page UI
- `src/components/GenerationContext.tsx` — Global SSE state
- `src/components/GenerationProgress.tsx` — Step indicator UI
- `playbook/CLAUDE.md` — App builder playbook (tech stack, styling, Dockerfile)
- `playbook/template/` — Starter boilerplate

## Known Playbook Fixes

- Tailwind CSS v4 requires `@tailwindcss/postcss` in postcss.config.mjs (not `tailwindcss` directly)
- `@theme` blocks only allow flat CSS custom properties or `@keyframes` — no nested selectors, `@dark` blocks, or wildcards
- Next.js 16 middleware `matcher` does not support regex lookaheads — use simple path patterns
- Generated apps use Prisma 6 (not 7) to avoid `url`/`prisma.config.ts`/adapter breaking changes
