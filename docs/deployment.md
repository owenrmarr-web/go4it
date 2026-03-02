# Deployment

Vercel platform deployment, Fly.io app deployment, DNS, SSL, env vars, Turso migrations.

> **For the app deploy pipeline** (how generated apps are built, stored, previewed, and deployed to Fly.io), see `docs/deploy-pipeline.md`.

---

## Production URLs

| What | Where |
|---|---|
| Production URL | https://go4it.live |
| Vercel URL | https://go4it-alpha.vercel.app |
| Builder service | https://go4it-builder.fly.dev |
| GitHub repo | https://github.com/owenrmarr-web/go4it |
| Database | Turso — `libsql://go4it-owenrmarr.aws-us-west-2.turso.io` |

## DNS

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `@` | A | `216.198.79.1` | Apex domain → Vercel |
| `www` | CNAME | `adca53baf26b1954.vercel-dns-017.com` | www → Vercel (redirect to apex) |
| `*` | CNAME | `fly-global.fly.dev` | Wildcard subdomains → Fly.io (**broken — NXDOMAIN, using .fly.dev fallback**) |

Nameservers: Google Domains (`ns-cloud-e*.googledomains.com`), managed via Squarespace Domains.

## Platform Deploys (Vercel)

- Push to `main` on GitHub → Vercel auto-builds and deploys
- `postinstall` script runs `prisma generate` on every build
- Platform API routes delegate to builder service when `BUILDER_URL` is set, with local fallback when unset

### Vercel env vars

`DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `RESEND_API_KEY`, `BUILDER_URL`, `BUILDER_API_KEY`

### Known warnings (non-blocking)

- `middleware.ts` deprecated in Next.js 16 — should become `proxy.ts` eventually
- `node-domexception` deprecation — transitive dep, harmless

## Turso Database

### Inspecting production state

Turso CLI is installed at `~/.turso/turso`. Use it to check what's actually in production:

```bash
# Interactive SQL shell
turso db shell go4it-owenrmarr

# One-off queries
turso db shell go4it-owenrmarr "SELECT name FROM sqlite_master WHERE type='table';"
turso db shell go4it-owenrmarr "SELECT COUNT(*) FROM User;"

# Database metadata (size, row counts)
turso db inspect go4it-owenrmarr
```

Existing query scripts in `prisma/scripts/query/` also work against Turso with the env override:
```bash
DATABASE_URL="libsql://go4it-owenrmarr.aws-us-west-2.turso.io" \
TURSO_AUTH_TOKEN="..." npx tsx prisma/scripts/query/query-apps.ts
```

### Schema source of truth

`prisma/schema.prisma` is always the intended schema. Production Turso should match it. If you suspect drift, compare with:
```bash
turso db shell go4it-owenrmarr ".schema"
```

### Seeding

Prisma CLI can't connect to Turso directly (`libsql://` not supported). Use the seed script:
```bash
npx tsx prisma/seed.ts
```
Reads `DATABASE_URL` + `TURSO_AUTH_TOKEN` from `.env`.

### Schema migrations

Prisma CLI can't run `db push` against Turso. Use custom migration scripts in `prisma/scripts/migrate/`.

**Migration workflow:**
1. Edit `prisma/schema.prisma` with the new columns/tables
2. Write a migration script in `prisma/scripts/migrate/migrate-<name>.ts` using `@libsql/client`
3. Run against Turso with explicit env override (see below)
4. Verify with `turso db shell go4it-owenrmarr ".schema <table>"`

**CRITICAL:** Migration scripts use `dotenv.config()` which loads `DATABASE_URL="file:./prisma/dev.db"` from local `.env`. You MUST override with explicit Turso env vars:
```bash
DATABASE_URL="libsql://go4it-owenrmarr.aws-us-west-2.turso.io" TURSO_AUTH_TOKEN="..." npx tsx prisma/scripts/migrate/migrate-<name>.ts
```
Without the override, migrations silently run against local SQLite — not production Turso. **This caused a production outage** (all API routes returning 500 due to missing columns).

For local dev: `DATABASE_URL="file:./dev.db" npx prisma db push`

## Fly.io App Deployment

### Flow

1. User adds app to org from marketplace → Account page → Configure team → Launch
2. `POST /api/organizations/[slug]/apps/[appId]/deploy` delegates to builder service
3. Builder resolves source (Vercel Blob or local template), runs `upgradeTemplateInfra()`, then `deployApp()` — see `docs/deploy-pipeline.md` for full details
4. On container startup, `start.sh` runs:
   - `prisma db push` → create/update tables
   - `provision-users.ts` → create team member accounts
   - `node server.js` → start Next.js
5. SSE streams progress to frontend
6. OrgApp updated with `flyAppId`, `flyUrl`, RUNNING status

### Fly env vars

- `FLY_API_TOKEN` — from `flyctl tokens create deploy` or dashboard
- `FLYCTL_PATH` — defaults to `~/.fly/bin/flyctl`
- `FLY_REGION` — defaults to `ord` (Chicago)

### Naming convention

- Format: `go4it-{orgSlug}-{shortOrgAppId}`
- URL: `https://go4it-{orgSlug}-{shortId}.fly.dev`

### Custom subdomains

- Wildcard DNS: `*.go4it.live CNAME fly-global.fly.dev` (**broken — NXDOMAIN**)
- Format: `{appSlug}-{orgSlug}.go4it.live`
- Auto-generated on deploy, customizable from Account → Configure
- `OrgApp.subdomain` (`@unique` constraint)
- `flyctl certs add {subdomain}.go4it.live --app {flyAppId}` provisions TLS
- `.fly.dev` URLs work as fallback (currently the only working option)

### Key files

- `src/lib/fly.ts` — Deployment orchestration
- `src/lib/subdomain.ts` — Subdomain generation + validation
- `src/app/api/organizations/[slug]/apps/[appId]/deploy/route.ts` — Deploy trigger
- `src/app/api/organizations/[slug]/apps/[appId]/subdomain/route.ts` — Subdomain management
- `src/app/api/organizations/[slug]/apps/[appId]/deploy/stream/route.ts` — SSE progress

### Prisma 7 compatibility (critical)

`fly.ts` auto-handles these Prisma 7 breaking changes during deploy prep:

- **No `url` in schema.prisma** — strips `url = env("DATABASE_URL")` from datasource block
- **`prisma.config.ts` at project root** — writes config with `defineConfig({ datasource: { url: process.env.DATABASE_URL } })`
- **PrismaClient requires adapter** — rewrites `src/lib/prisma.ts` and `prisma/provision-users.ts` to use `PrismaLibSql` adapter
- **`--skip-generate` removed** — start.sh uses `--accept-data-loss` only
- **Debian, not Alpine** — `@prisma/adapter-libsql` fails on Alpine (`fcntl64`). Docker images use `node:20-slim`
- **`@ts-nocheck` on prisma.config.ts** — prevents TS errors during `next build`

### Runtime notes

- `auto_stop_machines = "suspend"` preserves memory state. Resume ~2-3s vs 15-30s for cold boot with `"stop"`.
- Fly.io trial: machines auto-stop after 5 min without credit card
- OpenSSL warning from Prisma on slim image is non-blocking

### Requirements

- Marketplace app must have a linked GeneratedApp with source in Vercel Blob (`uploadBlobUrl`) or a Go Suite template (`templateApp`)
- All deploys go through `deployApp()` with a full Docker rebuild — there is no instant deploy / preview promotion. See `docs/deploy-pipeline.md` for details.

### Testing locally

```bash
curl -L https://fly.io/install.sh | sh
~/.fly/bin/flyctl auth login
# Start dev server, log in, add app to org, configure team, click Launch
```
