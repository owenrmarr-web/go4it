# GO4IT — Project Context for Claude Code

## Company Vision

GO4IT is a free marketplace for AI-generated SaaS applications targeting small and medium businesses (5–50 employees). US small businesses spend ~$1,400/employee/year on SaaS. GO4IT lowers that by an order of magnitude by letting users either pick from a library of existing apps or create their own via AI-powered vibe coding (Claude Code under the hood).

**Slogan:** Free software tools to help small businesses do big things.

**Revenue model:** GO4IT hosts deployed app instances for users on Fly.io, charging a fixed ~20% premium on top of infrastructure costs. Still a 5–10x savings vs. current SaaS spend.

**Domain:** go4it.live (purchased on Squarespace, pointed at Vercel)

**Vibe:** Upbeat, fun, summer energy. Orange / pink / purple gradient palette.

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
- **Live preview** (`src/lib/previewer.ts`) — users can preview generated apps locally before publishing. Spawns a dev server on a dynamic port (4001+). Auth bypassed via `PREVIEW_MODE` env var (patches `auth.ts` to return fake session). Skips npm install/db setup if already done during generation.
- **Parallel npm install** — `npm install` runs in background during Claude Code generation so dependencies are ready when generation completes. Preview startup is near-instant.
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
    username.ts          — Username validation (reserved names, uniqueness check via Prisma)
    username-utils.ts    — Pure username utilities (safe for client-side import)
    constants.ts         — Use case options, country list

  types/
    index.ts             — TS interfaces: App, InteractionType

builder/                   — Standalone builder service (deployed to Fly.io)
  package.json             — fastify, prisma, libsql, tsx
  Dockerfile               — Node 20 slim + flyctl + playbook
  fly.toml                 — Fly.io config (shared-cpu-2x, 1GB RAM, 10GB volume)
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
9. Generated apps are self-contained: Next.js 16, Tailwind CSS 4, Prisma 6 + SQLite, Dockerfile included

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
- **VM:** shared-cpu-2x, 1024MB RAM
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

1. **Custom domains (phase 2)** — Support user-owned domains like `crm.mybusiness.com` (CNAME validation + Fly.io per-app certs).
2. **Playbook refinement** — Continue improving `playbook/CLAUDE.md` based on generation results. Track common issues and add guardrails.
3. **Billing** — Track per-user Fly.io usage, charge 20% premium. Stripe integration.
4. **Builder hardening** — Garbage collection for old workspaces, rate limiting, error logging/monitoring.

### Completed
- ~~Builder service for production~~ — Standalone Fastify API on Fly.io (`go4it-builder.fly.dev`). Platform delegates generation, iteration, preview, and deploy via HTTP. Production generation works end-to-end.
- ~~Usernames & leaderboard~~ — Unique usernames, auto-generated on signup, creator rankings by hearts/deploys.
- ~~Custom subdomain routing~~ — `*.go4it.live` wildcard DNS + auto-generated subdomains + Fly.io TLS certs. Configurable from Account page.
- ~~App iteration~~ — Users can refine generated apps with follow-up prompts (CLI `--continue`)
- ~~Publish to marketplace~~ — Generated apps can be published (public or private)
- ~~1:1 org simplification~~ — Auto-create org on signup, consolidated account page
- ~~Theme-aware UI~~ — CSS variables from logo extraction applied to all branded elements
- ~~Starter template~~ — Pre-built boilerplate for generated apps (auth, prisma, config, Dockerfile)
- ~~Live preview~~ — Preview generated apps locally before publishing (auth bypass, parallel install)
- ~~Marketplace cleanup~~ — Removed seeded placeholder apps, only real generated apps shown
- ~~Admin creations tab~~ — Admin dashboard shows all generated apps with creator/status/iterations
