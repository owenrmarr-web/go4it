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
2. **Interact** — Hover an app card to see description + heart (save) / star (deploy) buttons.
3. **Account** — "My Account" shows all hearted and starred apps in one place.
4. **Create** — Users write a plain-English prompt. Claude Code CLI generates the app autonomously. Progress shown via animated step indicator. User can iterate, then publish (public or private) to GO4IT.
5. **Deploy** — Starred apps get containerized (Docker) and hosted by GO4IT on Fly.io. Users access via `mybusiness.go4it.live` subdomain or their own custom domain. GO4IT handles all infra — no cloud expertise required.

---

## What's Built So Far

- **App store landing page** (`src/app/page.tsx`) — grid of 16 seeded marketplace apps with search/filter
- **Auth** — NextAuth credentials provider (email + bcrypt password). Protected `/account` route via middleware.
- **Heart / Star interactions** — POST/DELETE API, persisted in DB, reflected in UI via custom `useInteractions` hook
- **My Account page** (`src/app/account/page.tsx`) — shows user's hearted and starred apps
- **User profile settings** (`src/app/account/settings/page.tsx`) — logo upload, company info, theme color extraction
- **Organizations & teams** — create orgs, invite members via email (Resend), role-based access (OWNER/ADMIN/MEMBER)
- **AI app generation** (`src/app/create/page.tsx`) — fully working! Users type a prompt, Claude Code CLI generates a complete app with auth, DB, seed data, and Dockerfile. Progress streamed via SSE.
- **App Builder Playbook** (`playbook/CLAUDE.md`) — instructions that ensure generated apps follow GO4IT conventions (Next.js 16, Tailwind CSS 4, Prisma + SQLite, Docker-ready)
- **16 seeded apps** in `prisma/seed.ts` — covers CRM, PM, invoicing, chat, HR, inventory, scheduling, etc.
- **Prisma schema** — User, Account, Session, VerificationToken, App, UserInteraction, GeneratedApp, Organization, OrganizationMember, Invitation models

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
| Hosting (generated apps) | Fly.io (planned) |

---

## Key File Map

```
playbook/
  CLAUDE.md              — App builder playbook (tech stack, styling, Dockerfile template)

prisma/
  schema.prisma          — DB models: User, App, UserInteraction, GeneratedApp, Organization, etc.
  seed.ts                — Seeds 16 demo apps (uses LibSQL adapter)
  migrate-generated-app.ts — Turso migration for GeneratedApp table

apps/
  .gitkeep               — Generated apps directory (gitignored, stored on disk only)

src/
  auth.ts                — NextAuth instance export
  auth.config.ts         — NextAuth config: credentials provider, callbacks, pages
  middleware.ts          — Protects /account route (requires session)

  app/
    layout.tsx           — Root layout (SessionProvider, ThemeProvider, Toaster)
    page.tsx             — Home / marketplace grid
    globals.css          — Tailwind imports + gradient-brand utility class

    auth/page.tsx        — Login / signup page
    account/page.tsx     — My Account (hearted + starred apps, organizations)
    account/settings/page.tsx — User profile settings (logo, company, theme)
    create/page.tsx      — AI app creation (prompt → progress → complete)
    org/new/page.tsx     — Create organization
    org/[slug]/admin/page.tsx — Organization admin dashboard
    invite/[token]/page.tsx   — Accept invitation

    api/
      apps/route.ts              — GET /api/apps (search + category filter)
      interactions/route.ts      — POST/DELETE /api/interactions (heart/star)
      account/interactions/route.ts — GET user's interactions
      account/profile/route.ts     — GET/PUT user profile
      auth/[...nextauth]/route.ts  — NextAuth handler
      auth/signup/route.ts         — POST signup (bcrypt)
      generate/route.ts            — POST start app generation job
      generate/[id]/stream/route.ts — GET SSE progress stream
      organizations/...            — Org CRUD, members, invitations
      invite/[token]/route.ts      — Accept invitation

  components/
    Header.tsx           — Top nav bar (Create, logo, My Account)
    AppCard.tsx          — App card with hover reveal: description, heart, star
    SearchBar.tsx        — Search input (filters apps client-side)
    GenerationProgress.tsx — Animated step indicator for app generation
    SessionProvider.tsx  — Wraps app in NextAuth SessionProvider
    ThemeProvider.tsx    — Dynamic theme colors from logo extraction

  hooks/
    useInteractions.ts   — Hook: manages heart/star state + API calls

  lib/
    prisma.ts            — Prisma singleton (LibSQL adapter)
    interactions.ts      — Fetch helpers: POST/DELETE interactions
    generator.ts         — Claude Code CLI spawning, progress parsing, DB updates
    email.ts             — Resend email client + invite template
    colorExtractor.ts    — Extract theme colors from uploaded logos
    constants.ts         — Use case options, country list

  types/
    index.ts             — TS interfaces: App, InteractionType
```

---

## AI App Generation (how it works)

1. User types a prompt on `/create` (must be logged in)
2. `POST /api/generate` creates a `GeneratedApp` record and spawns Claude Code CLI
3. CLI runs in `apps/{generationId}/` directory with the playbook as `CLAUDE.md`
4. CLI flags: `-p` (print mode), `--output-format stream-json`, `--verbose`, `--dangerously-skip-permissions`, `--model sonnet`
5. Progress parsed from stream-json output via `[GO4IT:STAGE:...]` markers defined in the playbook
6. SSE endpoint (`/api/generate/[id]/stream`) streams progress to the frontend
7. On completion, app metadata extracted from `package.json` and saved to DB
8. Generated apps are self-contained: Next.js 16, Tailwind CSS 4, Prisma + SQLite, Dockerfile included

**Environment requirement:** `ANTHROPIC_API_KEY` must be set in `.env` (separate from Claude subscription — needs API credits at console.anthropic.com)

**Known playbook fixes applied:**
- Tailwind CSS v4 requires `@tailwindcss/postcss` in postcss.config.mjs (not `tailwindcss` directly)

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

## Architecture Decisions (2026-02-06)

- **Deployment target:** Fly.io (not AWS EC2/LightSail) — scale-to-zero, built-in subdomain routing, simpler ops
- **AI engine:** Claude Code CLI invoked as subprocess (not Agent SDK or raw API)
- **App builder playbook:** `playbook/CLAUDE.md` copied into each workspace — ensures consistent tech stack and conventions
- **Code storage:** Local file system during generation → Cloudflare R2 archival later
- **Progress UX:** Step-based indicators via SSE (not raw terminal output)

---

## Next Steps (Roadmap — in priority order)

1. **Containerize & deploy via Fly.io** — Build orchestration so starring an app actually deploys it to `orgname.go4it.live`. Requires: Fly.io account, Machines API integration, subdomain routing, TLS.
2. **App iteration** — Let users refine generated apps with follow-up prompts (re-run Claude Code CLI on existing workspace with `--continue` or new prompt).
3. **Publish to marketplace** — After generation, user can publish their app (public or private). Creates an App record linked to the GeneratedApp.
4. **Playbook refinement** — Continue improving `playbook/CLAUDE.md` based on generation results. Track common issues (like the Tailwind PostCSS fix) and add guardrails.
5. **Builder service for production** — Extract `src/lib/generator.ts` into a standalone Fly.io service so generation works in production (not just local dev).
6. **Billing** — Track per-user Fly.io usage, charge 20% premium. Stripe integration.
7. **Custom domains** — Support `crm.mybusiness.com` alongside `mybusiness.go4it.live`.
