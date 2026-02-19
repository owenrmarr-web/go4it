# GO4IT — Project Context for Claude Code

## Company Vision

GO4IT is a free marketplace for AI-generated SaaS applications targeting small and medium businesses (5–50 employees). US small businesses spend ~$1,400/employee/year on SaaS. GO4IT lowers that by an order of magnitude by letting users either pick from a library of existing apps or create their own via AI-powered vibe coding (Claude Code under the hood).

**Slogan:** Free software tools to help small businesses do big things.

**Revenue model:** GO4IT hosts deployed app instances for users on Fly.io, charging a fixed ~20% premium on top of infrastructure costs. Still a 5–10x savings vs. current SaaS spend.

**Domain:** go4it.live (purchased on Squarespace, pointed at Vercel)

**Vibe:** Upbeat, fun, summer energy. Orange / pink / purple gradient palette.

**UX philosophy:** The experience should feel *magical* — fast, flawless, and intuitive. Users should never feel like they're wrestling with the product. Prioritize getting everything working end-to-end first, then optimize with real usage data. Speed matters, but correctness and polish come first.

---

## How It Works (Full Product Flow)

1. **Browse** — Users land on an app-store grid of SaaS tools (CRM, PM, chat, etc.). Search bar filters by name/category.
2. **Interact** — Hover an app card to see description + heart (save) / add (deploy) buttons.
3. **Account** — "My Account" is a single consolidated dashboard: My Apps (deploy/configure/launch), Team Members (invite/roles/remove), and Saved Apps.
4. **Create** — Users write a plain-English prompt. Claude Code CLI generates the app autonomously. Progress shown via animated step indicator + persistent header chip. User can iterate with follow-up prompts, then publish to GO4IT marketplace.
5. **Deploy** — Added apps get containerized (Docker) and hosted by GO4IT on Fly.io. Users configure team access, then launch. GO4IT handles all infra — no cloud expertise required.

---

## What's Built So Far

- **App store landing page** (`src/app/page.tsx`) — grid of marketplace apps with search/filter
- **Auth** — NextAuth credentials provider (email + bcrypt password). Protected `/account` route via middleware.
- **Heart / Add interactions** — POST/DELETE API, persisted in DB, reflected in UI via custom `useInteractions` hook
- **Consolidated Account page** (`src/app/account/page.tsx`) — single dashboard with three sections: My Apps (full deploy management with configure/launch/visit/remove), Team Members (invite/roles/remove/pending invitations), and Saved Apps (hearted marketplace apps)
- **1:1 org simplification** — Orgs auto-created on signup when company name provided. Lazy creation from Account Settings. Single org per user simplifies UX for demos. Schema unchanged (supports multiple orgs if needed later).
- **User profile settings** (`src/app/account/settings/page.tsx`) — logo upload, company info, theme color extraction. Syncs org branding automatically.
- **Organizations & teams** — invite members via email (Resend), role-based access (OWNER/ADMIN/MEMBER), all managed from Account page
- **AI app generation** (`src/app/create/page.tsx`) — fully working! Users type a prompt, Claude Code CLI generates a complete app with auth, DB, seed data, and Dockerfile. Progress streamed via SSE.
- **App iteration** — Users can refine generated apps with follow-up prompts. Uses Claude Code CLI `--continue` flag on existing workspace. Tracks iteration count on GeneratedApp.
- **App publishing** — Generated apps can be published to the marketplace (public or private). Creates an App record linked to the GeneratedApp.
- **Global generation progress** (`src/components/GenerationContext.tsx`) — persistent SSE connection + localStorage. Progress chip in Header survives page navigation. Single SSE connection shared across components.
- **Theme-aware UI** — CSS variables (`--theme-primary`, `--theme-secondary`, `--theme-accent`) extracted from uploaded logos. GO4IT logo, Create button, headings, progress bars, and gradient backgrounds all respect the theme.
- **App Builder Playbook** (`playbook/CLAUDE.md`) — instructions that ensure generated apps follow GO4IT conventions (Next.js 16, Tailwind CSS 4, Prisma 6 + SQLite, Docker-ready). Includes Tailwind v4 `@theme` restrictions and middleware regex guardrails.
- **Starter template** (`playbook/template/`) — pre-built boilerplate (package.json, auth, prisma schema, Dockerfile, layout, globals.css) copied into each generated app workspace before Claude Code runs. Saves generation time and ensures consistency.
- **Auto-deploy preview pipeline** (`builder/src/lib/generator.ts`, `builder/src/lib/fly.ts`) — When an app finishes generating, it automatically deploys to Fly.io as a preview (slim Dockerfile using `.next/standalone`). Fly infra (app + volume + secrets) pre-created in parallel with CLI generation for speed. Includes build validation with auto-fix loop (up to 2 attempts via Claude Code `--continue`), `prisma format` for schema relation fixes, and screenshot capture via Puppeteer. **Status: pipeline code complete but build failures in generated code prevent successful deploys — see roadmap item #1.**
- **Live preview (legacy)** (`src/lib/previewer.ts`) — local dev preview via `next dev`. Superseded by auto-deploy pipeline but kept as local dev fallback.
- **Parallel npm install** — `npm install --ignore-scripts` runs in background during Claude Code generation so dependencies are ready when generation completes. Separate `prisma format` + `prisma generate` run after install to handle schema issues.
- **Fly.io deployment pipeline** (`src/lib/fly.ts`) — fully working! Account page → configure team → Launch → app containerized (Docker), deployed to Fly.io with SQLite volume, team members provisioned. Auto-detects Prisma 6 vs 7 for compatibility fixes. Progress streamed via SSE with DB fallback for HMR.
- **Admin dashboard** (`src/app/admin/page.tsx`) — user/org/creations management for platform admins (isAdmin flag on User model). Creations tab shows all generated apps with creator, status, iterations, and publish state.
- **Marketplace cleanup** — seeded placeholder apps removed. Only real generated+published apps appear. Empty state CTA directs users to create.
- **Usernames** — unique usernames (3-20 chars, lowercase + numbers + underscores). Auto-generated from name on signup, editable in Account Settings. Reserved name list. Username displayed on app cards and creator profiles.
- **Leaderboard** (`src/app/api/leaderboard/route.ts`) — aggregates creators by total hearts and total deploys. Powers marketplace creator rankings.
- **Builder service** (`builder/`) — standalone Fastify API on Fly.io for production app generation, iteration, preview, and deployment. Platform delegates via HTTP when `BUILDER_URL` is set. See "Builder Service" section below.
- **Prisma schema** — User, Account, Session, VerificationToken, App, UserInteraction, GeneratedApp, AppIteration, Organization, OrganizationMember, Invitation, OrgApp, OrgAppMember models

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth v5 beta (credentials provider) |
| ORM | Prisma 7 (platform) / Prisma 6 (generated apps) |
| DB adapter | LibSQL via `@prisma/adapter-libsql` |
| DB (dev) | SQLite file (`dev.db`) |
| DB (prod) | Turso (cloud LibSQL) |
| AI generation | Claude Code CLI (`npx @anthropic-ai/claude-code`) |
| Toasts | Sonner |
| Email | Resend (`noreply@go4it.live`) |
| Hosting (platform) | Vercel |
| Hosting (generated apps) | Fly.io (working — flyctl CLI via `src/lib/fly.ts`) |

---

## Key File Map

```
playbook/
  CLAUDE.md              — App builder playbook (tech stack, styling, Dockerfile template)
  template/              — Starter template copied into each generated app workspace

prisma/
  schema.prisma          — DB models: User, App, GeneratedApp, AppIteration, Organization, OrgApp, etc.
  seed.ts                — Seeds admin user for dev (uses LibSQL adapter)
  migrate-*.ts           — Turso migration scripts (one per schema change)

apps/
  .gitkeep               — Generated apps directory (gitignored, stored on disk only)

src/
  auth.ts                — NextAuth instance export
  auth.config.ts         — NextAuth config: credentials provider, callbacks, pages
  middleware.ts          — Protects /account route (requires session)

  app/
    layout.tsx           — Root layout (SessionProvider, ThemeProvider, GenerationProvider, Toaster)
    page.tsx             — Home / marketplace grid
    globals.css          — Tailwind imports, theme CSS variables, gradient utilities

    auth/page.tsx        — Login / signup page
    account/page.tsx     — Consolidated dashboard: My Apps, Team Members, Saved Apps
    account/settings/page.tsx — User profile settings (logo, company, theme)
    create/page.tsx      — AI app creation (prompt → progress → preview → refine → publish)
    admin/page.tsx       — Platform admin dashboard (users, orgs, creations)
    org/[slug]/admin/page.tsx — Organization admin (legacy, still functional)
    invite/[token]/page.tsx   — Accept invitation

    api/
      apps/route.ts              — GET /api/apps (search + category filter)
      interactions/route.ts      — POST/DELETE /api/interactions (heart/add)
      account/interactions/route.ts — GET user's interactions
      account/profile/route.ts     — GET/PUT user profile (syncs org branding)
      account/org/route.ts         — GET user's org + apps + members + invitations
      auth/[...nextauth]/route.ts  — NextAuth handler
      auth/signup/route.ts         — POST signup (bcrypt, auto-create org)
      generate/route.ts            — POST start app generation job
      generate/[id]/stream/route.ts — GET SSE progress stream (DB fallback)
      generate/[id]/iterate/route.ts — POST start iteration on existing app
      generate/[id]/publish/route.ts — POST publish generated app to marketplace
      generate/[id]/preview/route.ts  — POST/GET/DELETE live preview management
      generate/[id]/status/route.ts  — GET generation status (polling fallback)
      admin/...                    — Admin API endpoints (users, orgs, generations)
      organizations/...            — Org CRUD, members, invitations
      organizations/[slug]/apps/route.ts — GET/POST/DELETE org apps
      organizations/[slug]/apps/[appId]/members/route.ts — GET/PUT app team access
      organizations/[slug]/apps/[appId]/deploy/route.ts — POST trigger Fly.io deploy
      organizations/[slug]/apps/[appId]/deploy/stream/route.ts — GET SSE deploy progress
      invite/[token]/route.ts      — Accept invitation

  components/
    Header.tsx             — Top nav bar (Create, logo, generation chip, My Account)
    AppCard.tsx            — App card with hover reveal: description, heart, add
    SearchBar.tsx          — Search input (filters apps client-side)
    GenerationContext.tsx   — Global generation state: SSE connection, localStorage persistence
    GenerationProgress.tsx — Animated step indicator (reads from GenerationContext)
    SessionProvider.tsx    — Wraps app in NextAuth SessionProvider
    ThemeProvider.tsx      — Dynamic theme colors from logo extraction → CSS variables

  hooks/
    useInteractions.ts   — Hook: manages heart/add state + API calls

  lib/
    prisma.ts            — Prisma singleton (LibSQL adapter)
    interactions.ts      — Fetch helpers: POST/DELETE interactions
    generator.ts         — Claude Code CLI spawning, progress parsing, iteration support, parallel npm install
    previewer.ts         — Live preview: dev server spawning, auth bypass, port allocation
    fly.ts               — Fly.io deployment: Prisma 6/7 auto-detection, flyctl wrapper
    email.ts             — Resend email client + invite template
    colorExtractor.ts    — Extract theme colors from uploaded logos
    slug.ts              — Slug generation for org URLs
    subdomain.ts         — Subdomain generation and validation
    team-sync.ts         — Sync team members to Fly.io apps via builder /secrets endpoint
    username.ts          — Username validation (reserved names, uniqueness check via Prisma)
    username-utils.ts    — Pure username utilities (safe for client-side import)
    constants.ts         — Use case options, country list

  types/
    index.ts             — TS interfaces: App, InteractionType

builder/                   — Standalone builder service (deployed to Fly.io)
  package.json             — fastify, prisma, libsql, tsx
  Dockerfile               — Node 20 slim + flyctl + playbook
  fly.toml                 — Fly.io config (shared-cpu-4x, 2GB RAM, 10GB volume)
  build.sh                 — Copies prisma/, playbook/, prisma.config.ts before Docker build
  src/
    index.ts               — Fastify server with auth middleware
    routes/
      generate.ts          — POST /generate (start new generation)
      iterate.ts           — POST /iterate (iterate on existing app)
      preview.ts           — POST /preview, DELETE /preview/:id
      deploy.ts            — POST /deploy (trigger Fly.io deployment)
      health.ts            — GET /health
    lib/
      generator.ts         — Adapted from src/lib/generator.ts (Turso writes, /data/apps paths)
      fly.ts               — Copied from src/lib/fly.ts (deployment orchestration)
      prisma.ts            — Prisma client with LibSQL adapter for Turso
```

---

## AI App Generation (how it works)

### Initial generation
1. User types a prompt on `/create` (must be logged in)
2. `POST /api/generate` creates a `GeneratedApp` record and spawns Claude Code CLI
3. Starter template (`playbook/template/`) copied into `apps/{generationId}/` as boilerplate
4. `npm install` started in parallel with Claude Code CLI (saves ~60s)
5. CLI runs with playbook as `CLAUDE.md`. Flags: `-p`, `--output-format stream-json`, `--verbose`, `--dangerously-skip-permissions`, `--model sonnet`
6. Progress parsed from stream-json output via `[GO4IT:STAGE:...]` markers defined in the playbook
7. SSE endpoint (`/api/generate/[id]/stream`) streams progress to the frontend (with DB fallback for HMR)
8. On completion: metadata extracted, parallel install awaited, incremental `npm install` + `prisma db push` + seed run during "finalizing" stage
9. **Build validation + auto-fix:** `npm run build` is run to catch TypeScript/build errors. If it fails, the error is extracted and fed back to Claude Code CLI via `--continue` with a fix prompt. Up to 2 auto-fix attempts before giving up. This catches issues like missing type augmentations, undefined properties, import errors, etc.
10. Generated apps are self-contained: Next.js 16, Tailwind CSS 4, Prisma 6 + SQLite, Dockerfile included

### Iteration / refine
1. User enters a follow-up prompt on the refine screen
2. `POST /api/generate/[id]/iterate` creates an `AppIteration` record and spawns CLI with `--continue`
3. CLI resumes in the same workspace directory, preserving prior context
4. Same SSE streaming, same progress tracking — `iterationCount` incremented on GeneratedApp

### Live preview
1. User clicks "Preview" on the create page after generation/iteration completes
2. `POST /api/generate/[id]/preview` calls `src/lib/previewer.ts` which:
   - Skips npm install/db setup if already done during generation
   - Patches `src/auth.ts` to return a fake session when `PREVIEW_MODE=true` (bypasses all auth)
   - Spawns `npx next dev -p <port>` with `PREVIEW_MODE=true` in env
   - Waits for server ready, returns URL
3. App opens in a new browser tab — no sign-in required
4. `DELETE /api/generate/[id]/preview` kills the process
5. Ports start at 4001, auto-increment. In-memory only — auto-cleanup on server restart.

### Publishing
1. User clicks "Publish" after generation/iteration is complete
2. `POST /api/generate/[id]/publish` creates an `App` record in the marketplace
3. App appears in the marketplace grid, linked to its GeneratedApp via `generatedAppId`

### Global progress tracking
- `GenerationContext` manages a single SSE connection per generation
- State persisted to localStorage — survives page navigation
- Compact progress chip in Header links back to `/create?gen={id}`

**Environment requirement:** `ANTHROPIC_API_KEY` must be set in `.env` (separate from Claude subscription — needs API credits at console.anthropic.com)

**Known playbook fixes applied:**
- Tailwind CSS v4 requires `@tailwindcss/postcss` in postcss.config.mjs (not `tailwindcss` directly)
- `@theme` blocks only allow flat CSS custom properties or `@keyframes` — no nested selectors, `@dark` blocks, or wildcards
- Next.js 16 middleware `matcher` does not support regex lookaheads (e.g. `(?!auth)`) — use simple path patterns
- Generated apps use Prisma 6 (not 7) to avoid `url`/`prisma.config.ts`/adapter breaking changes

---

## Deployment (live as of 2026-02-09)

| What | Where |
|---|---|
| Production URL | https://go4it.live |
| Vercel URL | https://go4it-alpha.vercel.app |
| Builder service | https://go4it-builder.fly.dev |
| GitHub repo | https://github.com/owenrmarr-web/go4it |
| Database | Turso (LibSQL) — `libsql://go4it-owenrmarr.aws-us-west-2.turso.io` |
| DNS | A record `@` → `216.198.79.1` (Squarespace → Vercel); `*` CNAME → `fly-global.fly.dev` (wildcard subdomains → Fly.io) |

### How deploys work
- Push to `main` on GitHub → Vercel auto-builds and deploys
- Env vars set in Vercel dashboard: DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, RESEND_API_KEY, BUILDER_URL, BUILDER_API_KEY
- `postinstall` script in package.json runs `prisma generate` on every build
- Platform API routes (generate, iterate, preview, deploy) delegate to builder service when `BUILDER_URL` is set, with local fallback when unset

### Seeding the DB
Prisma CLI can't connect to Turso directly (`libsql://` scheme not supported by CLI).
Use the seed script directly — it uses the LibSQL adapter at runtime:
```
npx tsx prisma/seed.ts
```
This reads DATABASE_URL + TURSO_AUTH_TOKEN from `.env`.

### Schema migrations to Turso
Prisma CLI can't run `db push` against Turso. Use custom migration scripts.

**CRITICAL:** Migration scripts use `dotenv.config()` which loads `DATABASE_URL="file:./prisma/dev.db"` from local `.env`. You MUST override with explicit Turso env vars:
```bash
DATABASE_URL="libsql://go4it-owenrmarr.aws-us-west-2.turso.io" TURSO_AUTH_TOKEN="..." npx tsx prisma/migrate-whatever.ts
```
Without the override, migrations silently run against local SQLite — not production Turso. This caused a production outage (all API routes returning 500 due to missing columns).

For local dev, use: `DATABASE_URL="file:./dev.db" npx prisma db push`

### Known warnings (non-blocking)
- `middleware.ts` deprecated in Next.js 16 — should become `proxy.ts` eventually
- `node-domexception` deprecation — transitive dep, harmless

---

## Architecture Decisions (2026-02-07)

- **Deployed app UX (2026-02-10):** Separate browser tabs per app (not embedded tabs in a unified dashboard). Each deployed app is a full Next.js deployment on its own subdomain — embedding via iframes would introduce CORS/auth/styling complexity for marginal UX gain. Fly.io suspend/resume is ~2-3s, which is acceptable. Future optimization: pre-warm apps by hitting health endpoints when Account page loads (zero architecture changes needed).
- **Deployment target:** Fly.io (not AWS EC2/LightSail) — scale-to-zero, built-in subdomain routing, simpler ops
- **AI engine:** Claude Code CLI invoked as subprocess (not Agent SDK or raw API)
- **App builder playbook:** `playbook/CLAUDE.md` copied into each workspace — ensures consistent tech stack and conventions
- **Code storage:** Local file system during generation → Cloudflare R2 archival later
- **Progress UX:** Step-based indicators via SSE (not raw terminal output)
- **App deployment:** flyctl CLI spawned as subprocess from `src/lib/fly.ts`. Generates fly.toml, Dockerfile.fly, and start.sh per app, then runs `flyctl deploy`. Each deployed app gets a 1GB volume for SQLite persistence.

---

## Fly.io Deployment (2026-02-07)

### How it works
1. User adds an app to their org from the marketplace (+ Add button on AppCard)
2. On the Account page (My Apps section), user clicks Configure to set team member access
3. User clicks "Launch" — triggers `POST /api/organizations/[slug]/apps/[appId]/deploy`
4. Deploy endpoint calls `src/lib/fly.ts` which:
   - Generates `fly.toml`, `Dockerfile.fly`, `start.sh` in the app's source directory
   - Runs `flyctl apps create go4it-{orgSlug}-{shortId}`
   - Creates a 1GB volume for SQLite data persistence
   - Sets secrets (AUTH_SECRET, GO4IT_TEAM_MEMBERS)
   - Runs `flyctl deploy` which builds the Docker image and deploys
5. On container startup, `start.sh` runs:
   - `prisma db push` to create/update database tables
   - `provision-users.ts` to create team member accounts
   - `node server.js` to start the Next.js app
6. Progress is streamed to the frontend via SSE endpoint
7. OrgApp record updated with flyAppId, flyUrl, and RUNNING status

### Environment variables needed
- `FLY_API_TOKEN` — Fly.io API token (get from `flyctl tokens create deploy` or dashboard)
- `FLYCTL_PATH` — Path to flyctl binary (defaults to `~/.fly/bin/flyctl`)
- `FLY_REGION` — Fly.io region (defaults to `ord` / Chicago)

### Fly app naming convention
- Format: `go4it-{orgSlug}-{shortOrgAppId}`
- Example: `go4it-zenith-space-a1b2c3d4`
- URL: `https://go4it-zenith-space-a1b2c3d4.fly.dev`

### Custom subdomains (2026-02-08)
- Wildcard DNS: `*.go4it.live CNAME fly-global.fly.dev` (set in Squarespace)
- Subdomain format: `{appSlug}-{orgSlug}.go4it.live` (e.g., `crm-zenith.go4it.live`)
- Auto-generated on deploy, customizable from Account → Configure panel
- Each deployed app stores its subdomain as `OrgApp.subdomain` (`@unique` constraint)
- `flyctl certs add {subdomain}.go4it.live --app {flyAppId}` provisions TLS via Let's Encrypt
- `.fly.dev` URLs continue to work as fallback
- Subdomain utility: `src/lib/subdomain.ts` (generation + validation with reserved name checks)
- Subdomain API: `src/app/api/organizations/[slug]/apps/[appId]/subdomain/route.ts` (GET/PUT — also handles cert updates for already-deployed apps)

### Key files
- `src/lib/fly.ts` — Deployment orchestration (creates app, volume, secrets, deploys, configures subdomain cert)
- `src/lib/subdomain.ts` — Subdomain generation and validation
- `src/app/api/organizations/[slug]/apps/[appId]/deploy/route.ts` — Deploy trigger endpoint (auto-generates subdomain)
- `src/app/api/organizations/[slug]/apps/[appId]/subdomain/route.ts` — Subdomain management (GET/PUT)
- `src/app/api/organizations/[slug]/apps/[appId]/deploy/stream/route.ts` — SSE progress stream
- Generated per-deploy: `fly.toml`, `Dockerfile.fly`, `start.sh` (written into app source dir)

### Prisma 7 compatibility (critical for deployed apps)
Prisma 7 has breaking changes that `fly.ts` handles automatically during deploy prep:
- **No `url` in schema.prisma** — Prisma 7 rejects `url = env("DATABASE_URL")` in the datasource block. `fly.ts` strips it out.
- **`prisma.config.ts` at project root** — Prisma 7 CLI loads config via `c12` from `<projectRoot>/prisma.config.ts` (NOT inside `prisma/` dir). `fly.ts` writes this file with `defineConfig({ datasource: { url: process.env.DATABASE_URL } })`.
- **PrismaClient requires adapter** — Bare `new PrismaClient()` fails in Prisma 7. Must pass `{ adapter }` using `PrismaLibSql`. `fly.ts` rewrites both `src/lib/prisma.ts` and `prisma/provision-users.ts` to use the adapter.
- **`--skip-generate` removed** — `prisma db push --skip-generate` is no longer valid; start.sh uses `--accept-data-loss` only.
- **Debian, not Alpine** — `@prisma/adapter-libsql` native bindings (`@libsql/linux-x64-musl`) fail on Alpine (`fcntl64` symbol not found). Docker images use `node:20-slim` (Debian/glibc).
- **`@ts-nocheck` on prisma.config.ts** — Prevents TypeScript errors during `next build` (prisma config types not in app's tsconfig).

### First successful deployment
- **Fly app:** `go4it-zenith-space-cmlco6oy` → `https://go4it-zenith-space-cmlco6oy.fly.dev`
- **Org:** Zenith Space (M&A Deal Tracker app)
- **Runtime confirmed:** DB synced in 430ms, 5 team members provisioned, Next.js ready in 194ms
- **Auto-suspend (not stop):** `auto_stop_machines = "suspend"` in fly.toml preserves memory state. Resume takes ~2-3s vs 15-30s for full cold boot with `"stop"`. Same cost — only billed while running.
- **Fly.io trial limitation:** Machines auto-stop after 5 minutes without credit card at https://fly.io/trial
- **OpenSSL warning (non-blocking):** Prisma warns about missing OpenSSL on slim image; could add `apt-get install -y openssl` to Dockerfile later

### Testing deployment locally
```bash
# 1. Install flyctl
curl -L https://fly.io/install.sh | sh

# 2. Authenticate
~/.fly/bin/flyctl auth login

# 3. Ensure FLY_API_TOKEN is set (or rely on flyctl auth)
# flyctl tokens create deploy → add to .env

# 4. Start dev server, log in, add an app to an org, configure team, click Launch
```

### Requirements for deployment
- The marketplace app must have a linked GeneratedApp record with a valid sourceDir
- Only apps that have been generated (have source code in apps/) can be deployed
- Seeded marketplace apps without source code will show an error when Launch is clicked

---

## Builder Service (2026-02-09)

The builder service is a standalone Fastify API running on Fly.io that handles app generation, iteration, preview, and deployment. The platform (Vercel) delegates to it via HTTP. This was necessary because generation requires a persistent filesystem, Claude Code CLI, and flyctl — none of which exist on Vercel.

### Architecture
```
Platform (Vercel)  ──HTTP──>  Builder Service (Fly.io)
   │                              │
   │ Reads Turso for              │ Writes progress to
   │ SSE progress                 │ GeneratedApp table
   │                              │
   └──────── Turso DB ────────────┘
```

The SSE endpoint (`/api/generate/[id]/stream`) already had a DB fallback — when in-memory progress is stale, it reads `GeneratedApp.status` from Turso. The builder writes progress directly to Turso, so existing SSE works with zero changes.

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate` | POST | Start new generation (202, runs in background) |
| `/iterate` | POST | Iterate on existing app (202, runs in background) |
| `/preview` | POST | Deploy preview machine (sync, ~60-90s) |
| `/preview/:id` | DELETE | Destroy preview machine |
| `/deploy` | POST | Deploy to Fly.io (202, runs in background) |
| `/health` | GET | Health check |

Auth: `Authorization: Bearer <BUILDER_API_KEY>` on every request.

### Platform integration pattern
All modified API routes check `process.env.BUILDER_URL`:
- **If set:** HTTP POST to builder, return response to client
- **If not set:** Dynamic `import()` of local modules (e.g., `await import("@/lib/generator")`) as fallback for local dev

Modified routes: `/api/generate`, `/api/generate/[id]/iterate`, `/api/generate/[id]/preview`, `/api/organizations/[slug]/apps/[appId]/deploy`

### Environment variables

**Builder (Fly.io secrets):**
- `ANTHROPIC_API_KEY` — Claude Code CLI
- `DATABASE_URL` — Turso URL
- `TURSO_AUTH_TOKEN` — Turso auth
- `FLY_API_TOKEN` — org-level token for deploying generated apps
- `BUILDER_API_KEY` — shared secret for platform→builder auth

**Platform (Vercel env vars):**
- `BUILDER_URL` — `https://go4it-builder.fly.dev`
- `BUILDER_API_KEY` — same shared secret

### Infrastructure
- **VM:** shared-cpu-4x, 2048MB RAM (upgraded from 2x/1GB — Claude Code CLI OOM'd on smaller machine)
- **Volume:** 10GB persistent storage at `/data` (workspaces stored at `/data/apps/{id}/`)
- **Cost:** ~$5-7/mo compute (scale-to-zero) + $1.50/mo volume
- **Playbook + template:** baked into Docker image via `build.sh`

### Deploying the builder
```bash
cd builder
./build.sh                    # copies prisma/, playbook/, prisma.config.ts
flyctl deploy --app go4it-builder
```

### Docker build notes
- Prisma 7 requires `prisma.config.ts` which reads `DATABASE_URL` at generate time
- Dockerfile uses `RUN DATABASE_URL="file:./dummy.db" npx prisma generate` (only schema matters for codegen)
- `dotenv` package required in builder because `prisma.config.ts` imports it

---

## Cost Model (2026-02-07)

| Service | Fixed/Monthly | Per-App Variable | Notes |
|---|---|---|---|
| Vercel (Pro) | $20/mo | — | Platform hosting, auto-deploy from GitHub |
| Turso | Free tier (9GB, 500 DBs) | — | Upgrade at ~$29/mo if needed |
| Fly.io | — | ~$2.68/mo/app (shared-cpu-1x 256MB + 1GB vol) | Scale-to-zero saves cost; trial needs credit card |
| Anthropic API | — | ~$0.30–$0.80/generation (sonnet, ~5K tokens) | Only for AI app generation |
| Resend | Free tier (3K emails/mo) | — | Team invite emails |
| Squarespace | $20/yr | — | Domain registration (go4it.live) |
| GitHub | Free | — | Public repo |

**Revenue target:** 20% premium on Fly.io infra cost per deployed app instance.

---

## Next Steps (Roadmap — in priority order)

1. ~~Team member sync without redeploy (DONE)~~ — See "Completed" section below.
2. ~~Persistent app previews in marketplace (DONE)~~ — See "Completed" section below.
3. ~~Fix Create page UI to show preview URL (FIXED)~~ — See "Completed" section below.
4. ~~Instant launch via secret flip (FIXED)~~ — See "Completed" section below.
5. ~~Email verification (DONE)~~ — See "Completed" section below.
6. **Billing** — Track per-user Fly.io usage, charge 20% premium. Stripe integration.
7. **Builder hardening** — Garbage collection for old workspaces, rate limiting, error logging/monitoring.
8. **Consumer-facing public pages (B2B2C)** — Generated apps should support a public-facing mode (no auth required) for end-customer interactions. Core example: a salon owner creates a scheduling app — their customers visit a public link to browse available slots, book appointments, and pay. The salon owner sees bookings, manages calendar, and views revenue from their authenticated dashboard. Other examples: restaurant reservation pages, service request forms, event ticket purchases, client intake forms. This is the key differentiator — GO4IT apps aren't just internal tools, they're customer-facing products. Needs: public route support in generated apps (`/public/*` routes without auth), separate customer-facing UI, payment collection via POS integration (see #14), data flows back to the business's authenticated dashboard. Playbook update to instruct Claude to generate both admin and public-facing pages when the prompt implies customer interaction.
9. **Model selection toggle** — Let users choose Sonnet (fast/cheap) vs Opus (slower/higher quality) on the Create page. Plan written but deferred. See `/Users/owenmarr/.claude/plans/reflective-tumbling-gizmo.md`.
10. **AI coworker Phase 2 — cross-app data queries** — GoChat (and future apps) expose a standard `/api/ai-query` endpoint. The AI coworker in GoChat can call other GO4IT apps' endpoints to answer business questions ("What were our top deals this month?" → queries CRM app). Apps on the same Fly.io org communicate via internal networking (`.internal` addresses). Requires: standardized query endpoint spec, auth between apps (shared org secret), response schema.
11. **AI coworker Phase 3 — proactive insights** — AI monitors cross-app data and surfaces insights in GoChat channels without being asked. Examples: "3 invoices are overdue and those customers haven't been contacted in CRM in 2 weeks", "Your top sales lead hasn't responded in 5 days — follow up?". Requires Phase 2 + scheduled polling/webhook system + notification routing logic.
12. **Fix custom subdomain DNS** — `*.go4it.live` CNAME points to `fly-global.fly.dev` which returns NXDOMAIN. Options: (a) per-app CNAME records via DNS API, or (b) shared reverse-proxy Fly app for wildcard routing. Currently using `.fly.dev` URLs as workaround.
13. **Custom domains (phase 2)** — Support user-owned domains like `crm.mybusiness.com` (CNAME validation + Fly.io per-app certs).
14. **POS integration** — Connect generated apps to point-of-sale systems so businesses can accept payments, sync inventory, and pull real sales data. Priority targets by SMB adoption: (1) **Square** — largest SMB install base, free REST API, no approval needed, OAuth for third-party apps. Key endpoints: Orders, Payments, Inventory, Customers, Catalog. (2) **Shopify POS** — popular with retail businesses that also sell online. GraphQL Admin API + REST. (3) **Clover** — common in restaurants/retail (Fiserv-owned), REST API. (4) **Toast** — restaurant-focused (200K+ locations), requires partner approval. Start with Square: add a "Connect Square" OAuth pattern to the playbook so generated apps can accept payments on public-facing pages (ties into #8 B2B2C) and pull sales data for dashboards/analytics. Playbook needs: OAuth flow template, payment collection on public routes, sales data sync pattern.

### Completed
- ~~Team member sync without redeploy (2026-02-18)~~ — Created `src/lib/team-sync.ts` with `syncTeamMembersToFly()` — updates `GO4IT_TEAM_MEMBERS` Fly.io secret via builder `/secrets/:flyAppId` endpoint when app members change. Hooked into OrgApp member PUT endpoint (syncs after member list update) and org member DELETE endpoint (cascades removal from all OrgAppMember records and syncs each affected running app). Secret update triggers Fly machine restart → `start.sh` re-provisions users. No full redeploy needed.
- ~~Persistent app previews in marketplace (2026-02-18)~~ — Published apps now keep their preview machines running indefinitely. Three changes: (1) `cleanupExpiredPreviews()` in builder now filters `appId: null` — skips published apps, (2) publish route clears `previewExpiresAt` so preview never expires, (3) marketplace API returns `previewFlyUrl` and AppCard shows a "Try it" button linking to the preview URL. Files: `builder/src/lib/cleanup.ts`, `src/app/api/generate/[id]/publish/route.ts`, `src/app/api/apps/route.ts`, `src/types/index.ts`, `src/components/AppCard.tsx`.
- ~~Instant launch via secret flip (2026-02-18)~~ — Two issues fixed in `launchApp()` (both `builder/src/lib/fly.ts` and `src/lib/fly.ts`): (1) Removed redundant `flyctl machines restart` — `flyctl secrets set` (without `--stage`) already triggers an automatic machine restart, so the explicit restart was causing a double-restart race condition. (2) Added health check polling after secret flip — after `flyctl secrets set` returns, the function now polls the app's URL (GET request, 3s interval, 90s timeout, accepts 200/302/307) to confirm the app is actually serving before marking it as RUNNING. Previously it marked RUNNING immediately after the restart command, before `start.sh` had finished provisioning. **Remaining:** end-to-end production testing of the full launch flow.
- ~~Email verification (2026-02-18)~~ — Full email verification flow on signup: user submits signup form → redirected to `/verify-email?email=...` ("Check your email" page) → Resend sends branded verification email with link → clicking link validates token, sets `emailVerified`, redirects to `/auth?verified=true` with success toast. Unverified users cannot sign in (admin@go4it.live bypassed). Anti-enumeration on resend endpoint. Files: `src/lib/verification.ts` (token helper), `src/app/api/auth/verify/route.ts`, `src/app/api/auth/resend-verification/route.ts`, `src/app/verify-email/page.tsx`, modified `src/auth.ts` (block unverified), `src/app/auth/page.tsx` (redirect + toasts), `src/app/api/auth/signup/route.ts` (wire in token), `src/lib/email.ts` (verification template).
- ~~Fix Create page preview URL (2026-02-18)~~ — Three root causes fixed: (1) SSE auto-reconnect with exponential backoff — if SSE connection drops mid-generation, client now reconnects (up to 5 retries) and checks status API before reconnecting to catch completed/failed generations, (2) status API verification — when SSE complete event arrives without `previewFlyUrl`, client fetches from status API as fallback, (3) manual preview fallback — when auto-deploy doesn't produce a URL (no org, deploy failed), Create page now shows a "Deploy Preview" button that triggers manual preview flow. Also fixed: builder iteration path now sets `currentStage: "complete"` in final DB update for consistency.
- ~~Playbook 3-tier rewrite (2026-02-16)~~ — Restructured `playbook/CLAUDE.md` from prescriptive layout rules to 3-tier system: Tier 1 (hard infrastructure rules), Tier 2 (design system tokens), Tier 3 (full creative freedom for layout/nav/UX). Removed sidebar mandate from BUILD REQUIREMENTS. Old playbook saved as `playbook/CLAUDE_old.md`.
- ~~Seed data fixes (2026-02-16)~~ — Fixed 3 seed issues: (1) duplicate records across iterations — `dev.db` now deleted before each `prisma db push` + seed, (2) preview session FK violation — admin user seeded with `id: "preview"` to match preview auth, (3) seed bleed into production — `launchApp()` now forces `flyctl machines restart` after secret flip.
- ~~Playbook pitfalls (2026-02-16)~~ — Added: don't redefine Prisma types (causes `Type 'X[]' not assignable to 'X[]'`), no external theme libraries (causes `useTheme must be within ThemeProvider`), generic package.json descriptions.
- ~~Create page auth flow (2026-02-16)~~ — Users can view/type on Create page without auth. Auth banner shown for unauthenticated users. Sign In stays inline (modal), Sign Up redirects to full `/auth` page with `callbackUrl` to return to Create. Password visibility toggle added to auth page.
- ~~Stale app cleanup (2026-02-16)~~ — Deleted all old app records from Turso (11 Apps, 25 GeneratedApps, 8 OrgApps) via `prisma/cleanup-apps.ts`. Home page hero changed to "AI-enabled software tools".
- ~~Auto-deploy pipeline working (2026-02-15)~~ — Builds now pass consistently. Unified preview/production Dockerfile deployed: includes full `node_modules/`, `prisma/`, smart `start.sh` with `PREVIEW_MODE` branching. Fixed `COPY dev.db` path (was at workspace root, actually at `prisma/dev.db`). Preview apps deploy automatically after generation. Pipeline bugs fixed across sessions: premature progress updates, stale state, npm install ordering, build error detection, `.next/standalone` verification.
- ~~Auto-deploy pipeline fixes (2026-02-14)~~ — Multiple pipeline bugs fixed across 4 commits: (1) premature `updateProgress("complete")` removed — now deferred until after Fly deploy, (2) safety net try/catch on close handler so DB never gets stuck at GENERATING, (3) stale `currentDetail` cleared on stage change, (4) `npm install --ignore-scripts` to prevent `postinstall: prisma generate` failures on invalid schemas + separate `prisma format` + `prisma generate`, (5) stale `.next/lock` removal before `tryBuild`, (6) `⨯` added to build error filter (Next.js error prefix), (7) `.next/standalone` existence check as build success verification, (8) frontend localStorage resume clears terminal states.
- ~~Fix Resend API key in Vercel (2026-02-14)~~ — Vercel had a different/old API key (`re_6YGLgzj2_...`) than the active one on Resend (`re_FBhdzJce_...`). Updated Vercel env var, redeployed. Invitation emails working.
- ~~Auth modal for unauthenticated users (2026-02-13)~~ — Heart/add interactions on home page show inline auth modal instead of redirect. Create page persists prompt to localStorage across auth flow. "Signup is free" messaging on auth page.
- ~~Color picker fix (2026-02-13)~~ — Color pickers on signup/auth page were unusable (`appearance: none` on small elements). Fixed with overlay pattern: visible colored div + invisible `<input type="color">` overlay.
- ~~Builder preview stability (2026-02-13)~~ — Three root causes fixed: (1) preview now gated on `gen.status === "COMPLETE"`, (2) build validation filters middleware deprecation warnings instead of triggering auto-fix, (3) `npm install` + proper env vars before starting dev server. Builder redeployed.
- ~~Portal deploying status (2026-02-13)~~ — Portal page (`/{slug}`) now shows DEPLOYING and ADDED apps. Deploying apps show amber "Deploying — usually takes 1-2 minutes" with pulse animation instead of "Coming Soon".
- ~~Deployed app URLs fixed (2026-02-10)~~ — Custom subdomain DNS broken (`fly-global.fly.dev` NXDOMAIN). Switched all deployed apps to `.fly.dev` URLs. Existing DB records migrated via `prisma/fix-fly-urls.ts`. Cert provisioning skipped until DNS is fixed.
- ~~Production preview fixed (2026-02-10)~~ — Preview was timing out because builder did a synchronous Fly.io deploy (2-5 min) within Vercel's 60s function limit. Converted to async pattern: builder returns 202, deploys in background, frontend polls GET `/preview/:id/status` every 3s until ready.
- ~~Password management (2026-02-10)~~ — 6-char minimum enforced on platform signup (server + client) and generated app template. Password change added to Account Settings (current + new + confirm, bcrypt verify). API at `/api/account/password`.
- ~~Universal admin account (2026-02-10)~~ — Every deployed app auto-provisions `admin@go4it.live` / `go4it2026` via updated `provision-users.ts`. Runs regardless of team member config.
- ~~Builder service for production~~ — Standalone Fastify API on Fly.io (`go4it-builder.fly.dev`). Platform delegates generation, iteration, preview, and deploy via HTTP. Production generation works end-to-end.
- ~~Usernames & leaderboard~~ — Unique usernames, auto-generated on signup, creator rankings by hearts/deploys.
- ~~Custom subdomain routing~~ — `*.go4it.live` wildcard DNS + auto-generated subdomains + Fly.io TLS certs. Configurable from Account page. **Note: DNS broken, using .fly.dev fallback (see roadmap item #2).**
- ~~App iteration~~ — Users can refine generated apps with follow-up prompts (CLI `--continue`)
- ~~Publish to marketplace~~ — Generated apps can be published (public or private)
- ~~1:1 org simplification~~ — Auto-create org on signup, consolidated account page
- ~~Theme-aware UI~~ — CSS variables from logo extraction applied to all branded elements
- ~~Starter template~~ — Pre-built boilerplate for generated apps (auth, prisma, config, Dockerfile)
- ~~Live preview~~ — Preview generated apps locally before publishing (auth bypass, parallel install)
- ~~Marketplace cleanup~~ — Removed seeded placeholder apps, only real generated apps shown
- ~~Admin creations tab~~ — Admin dashboard shows all generated apps with creator/status/iterations
- ~~Generation UX improvements~~ — Real-time detail text below stage indicator (shows what Claude is doing, e.g. "Creating src/components/Calendar.tsx"), timing copy updated to "5–10 minutes"
