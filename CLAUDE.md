# GO4IT — Project Context for Claude Code

## Company Vision

GO4IT is a free marketplace and hosting platform for AI-generated SaaS applications targeting small businesses (5–50 employees). US small businesses spend ~$1,400/employee/year on SaaS. GO4IT lowers that by an order of magnitude by letting users either pick from a library of existing apps or create their own via AI-powered vibe coding (Claude Code under the hood).

**Slogan:** Free software tools to help small businesses do big things.

**Revenue model:** GO4IT hosts deployed app instances for users on Fly.io, charging $5/app/mo and $1/seat/app/mo. Still a 5–10x savings vs. current SaaS spend.

**Domain:** go4it.live (purchased on Squarespace, pointed at Vercel)

**Vibe:** Upbeat, fun, summer energy. Orange / pink / purple gradient palette.

**UX philosophy:** The experience should feel *magical* — fast, flawless, and intuitive. Users should never feel like they're wrestling with the product. Prioritize getting everything working end-to-end first, then optimize with real usage data. Speed matters, but correctness and polish come first.

---

## Product Flow

1. **Browse** — App-store grid of SaaS tools. Search bar filters by name/category.
2. **Interact** — Hover cards for description + heart / add buttons.
3. **Account** — Consolidated dashboard: My Apps, Team Members, Saved Apps.
4. **Create** — Plain-English prompt → Claude Code CLI generates app → iterate → publish.
5. **Deploy** — Containerized (Docker) on Fly.io. Configure team access, then launch.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, Tailwind CSS 4 |
| Auth | NextAuth v5 beta (credentials provider) |
| ORM | Prisma 7 (platform) / Prisma 6 (generated apps) |
| DB | Turso (cloud LibSQL) in prod, SQLite (`dev.db`) in dev, adapter: `@prisma/adapter-libsql` |
| AI generation | Claude Code CLI (`npx @anthropic-ai/claude-code`) |
| Hosting | Vercel (platform), Fly.io (generated apps via `src/lib/fly.ts`) |

---

## Key File Map

```
playbook/
  CLAUDE.md              — App builder playbook (tech stack, styling, Dockerfile template)
  template/              — Starter template copied into each generated app workspace

prisma/
  schema.prisma          — DB models: User, App, GeneratedApp, AppIteration, Organization, OrgApp, etc.
  seed.ts                — Seeds admin user for dev (uses LibSQL adapter)
  scripts/               — Organized by type: migrate/, backfill/, cleanup/, fix/, query/, redeploy/, seed/, misc/

apps/
  .gitkeep               — Generated apps directory (gitignored, stored on disk only)
  <id>/CLAUDE.md          — Per-app context (generated apps have their own CLAUDE.md)

src/
  auth.ts                — NextAuth instance export
  auth.config.ts         — NextAuth config: credentials provider, callbacks, public route list
  middleware.ts          — Protects /account route (requires session)

  app/
    layout.tsx           — Root layout (SessionProvider, ThemeProvider, GenerationProvider, Toaster)
    page.tsx             — Home / marketplace grid
    globals.css          — Tailwind imports, theme CSS variables, gradient utilities
    auth/page.tsx        — Login / signup page
    account/page.tsx     — Consolidated dashboard (role-based visibility)
    create/page.tsx      — AI app creation (prompt → progress → preview → refine → publish)
    admin/page.tsx       — Platform admin dashboard
    [slug]/page.tsx      — Org portal page

    api/
      apps/route.ts              — GET /api/apps (search + category filter)
      interactions/route.ts      — POST/DELETE /api/interactions (heart/add)
      generate/route.ts          — POST start app generation
      generate/[id]/stream/route.ts — GET SSE progress stream
      generate/[id]/iterate/route.ts — POST iterate on existing app
      generate/[id]/publish/route.ts — POST publish to marketplace
      organizations/[slug]/apps/[appId]/deploy/route.ts — POST trigger Fly.io deploy

  components/
    Header.tsx             — Top nav bar (Create, logo, generation chip, My Account)
    AppCard.tsx            — App card with hover reveal
    GenerationContext.tsx   — Global generation state: SSE, localStorage persistence
    ThemeProvider.tsx      — Dynamic theme colors → CSS variables

  lib/
    prisma.ts            — Prisma singleton (LibSQL adapter)
    generator.ts         — Claude Code CLI spawning, progress parsing
    fly.ts               — Fly.io deployment: Prisma 6/7 auto-detection, flyctl wrapper
    team-sync.ts         — Real-time team member sync to deployed apps
    email.ts             — Resend email client + templates

builder/                   — Standalone builder service (deployed to Fly.io)
  src/index.ts             — Fastify server with auth middleware
  src/lib/generator.ts     — Adapted generator (Turso writes, /data/apps paths)
  src/lib/fly.ts           — Deployment orchestration
```

---

## Critical Gotchas

- **Turso migrations:** Scripts use `dotenv.config()` which loads local `DATABASE_URL`. You MUST override with explicit Turso env vars or migrations silently run against local SQLite. This caused a production outage. See `docs/deployment.md`.
- **Tailwind CSS v4:** Requires `@tailwindcss/postcss` in postcss.config.mjs. `@theme` blocks only allow flat CSS custom properties or `@keyframes`.
- **Next.js 16 middleware:** `matcher` does not support regex lookaheads in generated apps — use simple path patterns.
- **Generated apps use Prisma 6** (not 7) to avoid breaking changes. `fly.ts` handles Prisma 7 compat at deploy time.
- **Builder deploys are manual:** Pushing to GitHub only deploys the platform (Vercel). Builder must be redeployed via `flyctl deploy` in `builder/`. See `docs/builder-service.md`.

---

## Environment Variables

### Required (platform)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Turso/LibSQL connection string |
| `TURSO_AUTH_TOKEN` | Turso cloud auth token |
| `AUTH_SECRET` | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | Base URL for auth callbacks |
| `ANTHROPIC_API_KEY` | Claude API key for app generation |
| `RESEND_API_KEY` | Resend email service key |
| `BUILDER_URL` | URL of the builder Fly.io service |
| `BUILDER_API_KEY` | Auth key for builder service |
| `GO4IT_ADMIN_PASSWORD` | Admin user password (bcrypt hashed) |
| `GO4IT_ORG_SECRET` | Org secret for app verification |

### Required (Fly.io deploys)

| Variable | Purpose |
|---|---|
| `FLYCTL_PATH` | Path to flyctl binary |
| `FLY_APP_NAME` | App name on Fly.io |
| `FLY_REGION` | Deploy region (default: `ord`) |
| `GO4IT_TEAM_MEMBERS` | JSON list of team members for provisioning |

---

## Current Focus (pre-launch)

Two priorities before going to market:

1. **Stripe billing** — Only hard blocker before taking real payments. Wire up subscription management ($5/app/mo + $1/seat/app/mo) end-to-end.
2. **Marketplace depth** — Perfect ONE reference GO4IT app (e.g., GoCRM) to nail the playbook, template, tech stack, and auth story. That becomes the gold-standard foundation. Then use it to efficiently build 14+ more apps across categories so the marketplace feels real to a small business owner walking in cold.

---

## Documentation Index

Read the relevant doc(s) from `docs/` before making changes. Each doc starts with a one-line summary.

| Doc | Read when... |
|-----|-------------|
| `docs/architecture.md` | Understanding how services connect, debugging cross-service issues, cost model |
| `docs/deploy-pipeline.md` | App deploy pipeline: source lifecycle, blob storage, preview vs production, infra versioning, redeploy scripts |
| `docs/deployment.md` | Deploying, DNS/SSL issues, env vars, Turso migrations, Fly.io config, Prisma 7 compat |
| `docs/app-generation.md` | Modifying app generation, playbook, template, build validation, iteration, preview |
| `docs/builder-service.md` | Changing builder endpoints, redeploying builder, Docker build issues |
| `docs/go-suite.md` | Working on Go Suite apps (GoCRM, GoChat, etc.), adding new apps, cross-app queries, GoChat iOS |
| `docs/auth-and-teams.md` | Auth flows, SSO, invitations, team sync, roles, member onboarding, passwords, usernames |
| `docs/ui-and-theming.md` | Theme colors, dark mode, CSS variables, avatars, deck, pricing page, org portal |
| `docs/roadmap.md` | Checking what's planned next, prioritizing work |
| `docs/completed-work.md` | Looking up how a past feature was implemented, debugging regressions |
| `playbook/CLAUDE.md` | Modifying the app builder playbook: protected files, design system, component library, seed data rules |

---

## Prisma Schema (models)

- **Auth:** User, Account, Session, VerificationToken
- **Marketplace:** App, UserInteraction, GeneratedApp, AppIteration
- **Organizations:** Organization, OrganizationMember, Invitation, OrgApp, OrgAppMember
