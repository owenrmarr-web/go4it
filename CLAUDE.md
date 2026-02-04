# GO4IT — Project Context for Claude Code

## Company Vision

GO4IT is a free marketplace for AI-generated SaaS applications targeting small and medium businesses (5–50 employees). US small businesses spend ~$1,400/employee/year on SaaS. GO4IT lowers that by an order of magnitude by letting users either pick from a library of existing apps or create their own via AI-powered vibe coding (Claude Code under the hood).

**Slogan:** Free software tools to help small businesses do big things.

**Revenue model:** GO4IT hosts deployed app instances for users on AWS (LightSail or EC2), charging a fixed ~20% premium on top of AWS costs. Still a 5–10x savings vs. current SaaS spend.

**Domain:** go4it.live (purchased on Squarespace, will be pointed at Vercel)

**Vibe:** Upbeat, fun, summer energy. Orange / pink / purple gradient palette.

---

## How It Works (Full Product Flow)

1. **Browse** — Users land on an app-store grid of SaaS tools (CRM, PM, chat, etc.). Search bar filters by name/category.
2. **Interact** — Hover an app card to see description + heart (save) / star (deploy) buttons.
3. **Account** — "My Account" shows all hearted and starred apps in one place.
4. **Create** — Users write a plain-English prompt. Claude Code generates the app autonomously. User iterates, then publishes (public or private) to GO4IT.
5. **Deploy** — Starred apps get containerized (Docker) and hosted by GO4IT on AWS. Users access via `mybusiness.go4it.live` subdomain or their own custom domain. GO4IT handles all AWS infra — no cloud expertise required.

---

## What's Built So Far

- **App store landing page** (`src/app/page.tsx`) — grid of 16 seeded marketplace apps with search/filter
- **Auth** — NextAuth credentials provider (email + bcrypt password). Protected `/account` route via middleware.
- **Heart / Star interactions** — POST/DELETE API, persisted in DB, reflected in UI via custom `useInteractions` hook
- **My Account page** (`src/app/account/page.tsx`) — shows user's hearted and starred apps
- **Create page** (`src/app/create/page.tsx`) — prompt input + "Generate" button that shows a "coming soon" modal (DemoModal)
- **16 seeded apps** in `prisma/seed.ts` — covers CRM, PM, invoicing, chat, HR, inventory, scheduling, etc.
- **Prisma schema** — User, Account, Session, VerificationToken, App, UserInteraction models

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
| DB (prod target) | Turso (cloud LibSQL) |
| Toasts | Sonner |
| Hosting target | Vercel |

---

## Key File Map

```
prisma/
  schema.prisma          — DB models: User, App, UserInteraction, etc.
  seed.ts                — Seeds 16 demo apps (uses LibSQL adapter)

src/
  auth.ts                — NextAuth instance export
  auth.config.ts         — NextAuth config: credentials provider, callbacks, pages
  middleware.ts          — Protects /account route (requires session)

  app/
    layout.tsx           — Root layout (SessionProvider, Toaster)
    page.tsx             — Home / marketplace grid
    globals.css          — Tailwind imports + gradient-brand utility class

    auth/page.tsx        — Login / signup page
    account/page.tsx     — My Account (hearted + starred apps)
    create/page.tsx      — AI create page (prompt input + demo modal)

    api/
      apps/route.ts              — GET /api/apps (search + category filter)
      interactions/route.ts      — POST/DELETE /api/interactions (heart/star)
      account/interactions/route.ts — GET user's interactions
      auth/[...nextauth]/route.ts   — NextAuth handler
      auth/signup/route.ts           — POST signup (bcrypt)

  components/
    Header.tsx           — Top nav bar (Create, My Account links)
    AppCard.tsx          — App card with hover reveal: description, heart, star
    SearchBar.tsx        — Search input (filters apps client-side)
    DemoModal.tsx        — "Coming soon" modal shown on Create page
    SessionProvider.tsx  — Wraps app in NextAuth SessionProvider

  hooks/
    useInteractions.ts   — Hook: manages heart/star state + API calls

  lib/
    prisma.ts            — Prisma singleton (LibSQL adapter)
    interactions.ts      — Fetch helpers: POST/DELETE interactions

  types/
    index.ts             — TS interfaces: App, InteractionType
```

---

## Current Session State (as of 2026-02-03)

### Uncommitted changes (ready to commit)
The previous session migrated the DB driver from `better-sqlite3` to `libsql`. Code changes are done and correct in:
- `package.json` — swapped deps
- `package-lock.json` — updated lock
- `prisma/seed.ts` — uses LibSQL adapter
- `src/lib/prisma.ts` — uses LibSQL adapter

### Launch checklist
- [ ] Commit the LibSQL migration
- [ ] Run `next build` to verify clean compile
- [ ] Create free Turso account → get DATABASE_URL + TURSO_AUTH_TOKEN
- [ ] Deploy to Vercel (connect repo, set env vars)
- [ ] Seed the Turso DB (`npx prisma db push` then seed script)
- [ ] Point go4it.live domain (Squarespace DNS) → Vercel

### Env vars needed in production (Vercel)
| Var | Value |
|---|---|
| `DATABASE_URL` | Turso DB URL (e.g. `libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `AUTH_SECRET` | Generate a new one for prod (`openssl rand -hex 32`) |

---

## Future Roadmap (not yet built — keep in mind architecturally)

1. **AI app creation** — Wire the Create page prompt to a Claude Code agent. Return a working app.
2. **Containerization** — Each created app becomes a Docker container. Self-sufficient (no external DBs). GO4IT stores and manages these containers.
3. **Deployment orchestration** — User stars an app → GO4IT spins up a Docker container on AWS LightSail/EC2. Fully automated, no cloud knowledge needed.
4. **Subdomain hosting** — Deployed apps served at `<business>.go4it.live`. Also support custom domains (`crm.mybusiness.com`).
5. **Billing** — Track per-user AWS usage, charge 20% premium. Integrate payment (Stripe likely).
6. **App publishing** — After creation, user chooses public or private. Public apps appear in the marketplace for others.
7. **App iteration** — Users can revisit and update their published apps via Claude Code.
