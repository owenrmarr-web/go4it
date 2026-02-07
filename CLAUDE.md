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
- **App Builder Playbook** (`playbook/CLAUDE.md`) — instructions that ensure generated apps follow GO4IT conventions (Next.js 16, Tailwind CSS 4, Prisma + SQLite, Docker-ready). Includes Tailwind v4 `@theme` restrictions guardrail.
- **Fly.io deployment pipeline** (`src/lib/fly.ts`) — fully working! Account page → configure team → Launch → app containerized (Docker), deployed to Fly.io with SQLite volume, team members provisioned. Auto-detects Prisma 6 vs 7 for compatibility fixes. Progress streamed via SSE with DB fallback for HMR.
- **Admin dashboard** (`src/app/admin/page.tsx`) — user/org management for platform admins (isAdmin flag on User model)
- **Prisma schema** — User, Account, Session, VerificationToken, App, UserInteraction, GeneratedApp, AppIteration, Organization, OrganizationMember, Invitation, OrgApp, OrgAppMember models

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth v5 beta (credentials provider) |
| ORM | Prisma 7 (client engine) |
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

prisma/
  schema.prisma          — DB models: User, App, GeneratedApp, AppIteration, Organization, OrgApp, etc.
  seed.ts                — Seeds demo apps (uses LibSQL adapter)
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
    create/page.tsx      — AI app creation (prompt → progress → refine → publish)
    admin/page.tsx       — Platform admin dashboard (users, orgs)
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
      generate/[id]/status/route.ts  — GET generation status (polling fallback)
      admin/...                    — Admin API endpoints (users, orgs)
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
    generator.ts         — Claude Code CLI spawning, progress parsing, iteration support
    fly.ts               — Fly.io deployment: Prisma 6/7 auto-detection, flyctl wrapper
    email.ts             — Resend email client + invite template
    colorExtractor.ts    — Extract theme colors from uploaded logos
    slug.ts              — Slug generation for org URLs
    constants.ts         — Use case options, country list

  types/
    index.ts             — TS interfaces: App, InteractionType
```

---

## AI App Generation (how it works)

### Initial generation
1. User types a prompt on `/create` (must be logged in)
2. `POST /api/generate` creates a `GeneratedApp` record and spawns Claude Code CLI
3. CLI runs in `apps/{generationId}/` directory with the playbook as `CLAUDE.md`
4. CLI flags: `-p` (print mode), `--output-format stream-json`, `--verbose`, `--dangerously-skip-permissions`, `--model sonnet`
5. Progress parsed from stream-json output via `[GO4IT:STAGE:...]` markers defined in the playbook
6. SSE endpoint (`/api/generate/[id]/stream`) streams progress to the frontend (with DB fallback for HMR)
7. On completion, app metadata extracted from `package.json` and saved to DB
8. Generated apps are self-contained: Next.js 16, Tailwind CSS 4, Prisma + SQLite, Dockerfile included

### Iteration / refine
1. User enters a follow-up prompt on the refine screen
2. `POST /api/generate/[id]/iterate` creates an `AppIteration` record and spawns CLI with `--continue`
3. CLI resumes in the same workspace directory, preserving prior context
4. Same SSE streaming, same progress tracking — `iterationCount` incremented on GeneratedApp

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

---

## Deployment (live as of 2026-02-03)

| What | Where |
|---|---|
| Production URL | https://go4it.live |
| Vercel URL | https://go4it-alpha.vercel.app |
| GitHub repo | https://github.com/owenrmarr-web/go4it |
| Database | Turso (LibSQL) — `libsql://go4it-owenrmarr.aws-us-west-2.turso.io` |
| DNS | A record `@` → `216.198.79.1` (set in Squarespace, verified on Vercel) |

### How deploys work
- Push to `main` on GitHub → Vercel auto-builds and deploys
- Env vars (DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, RESEND_API_KEY) are set in Vercel dashboard
- `postinstall` script in package.json runs `prisma generate` on every build
- **Note:** The Create/Generate feature only works locally (requires persistent file system + Claude Code CLI). Production deployment of the builder service is a future task.

### Seeding the DB
Prisma CLI can't connect to Turso directly (`libsql://` scheme not supported by CLI).
Use the seed script directly — it uses the LibSQL adapter at runtime:
```
npx tsx prisma/seed.ts
```
This reads DATABASE_URL + TURSO_AUTH_TOKEN from `.env`.

### Schema migrations to Turso
Prisma CLI can't run `db push` against Turso. Use custom migration scripts:
```
npx tsx prisma/migrate-generated-app.ts
```
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

### Key files
- `src/lib/fly.ts` — Deployment orchestration (creates app, volume, secrets, deploys)
- `src/app/api/organizations/[slug]/apps/[appId]/deploy/route.ts` — Deploy trigger endpoint
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

1. **Custom domain routing** — Support `orgname.go4it.live` subdomains (Fly.io certs + wildcard DNS on go4it.live) and eventually `crm.mybusiness.com` custom domains.
2. **Playbook refinement** — Continue improving `playbook/CLAUDE.md` based on generation results. Track common issues and add guardrails.
3. **Builder service for production** — Extract `src/lib/generator.ts` into a standalone Fly.io service so generation works in production (not just local dev).
4. **Billing** — Track per-user Fly.io usage, charge 20% premium. Stripe integration.

### Completed
- ~~App iteration~~ — Users can refine generated apps with follow-up prompts (CLI `--continue`)
- ~~Publish to marketplace~~ — Generated apps can be published (public or private)
- ~~1:1 org simplification~~ — Auto-create org on signup, consolidated account page
- ~~Theme-aware UI~~ — CSS variables from logo extraction applied to all branded elements
