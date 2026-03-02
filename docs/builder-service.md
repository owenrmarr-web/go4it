# Builder Service

Standalone Fastify API on Fly.io for production app generation, iteration, preview, and deployment. Exists because Vercel lacks persistent filesystem, Claude Code CLI, and flyctl.

---

## Architecture

```
Platform (Vercel)  ──HTTP──>  Builder Service (Fly.io)
   │                              │
   │ Reads Turso for              │ Writes progress to
   │ SSE progress                 │ GeneratedApp table
   │                              │
   └──────── Turso DB ────────────┘
```

The platform SSE endpoint (`/api/generate/[id]/stream`) has a DB fallback — reads `GeneratedApp.status` from Turso when in-memory progress is stale. Builder writes directly to Turso, so existing SSE works with zero changes.

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate` | POST | Start new generation (202, background) |
| `/iterate` | POST | Iterate on existing app (202, background) |
| `/preview` | POST | Deploy preview machine (sync, ~60-90s) |
| `/preview/:id` | DELETE | Destroy preview machine |
| `/deploy` | POST | Deploy to Fly.io (202, background) |
| `/health` | GET | Health check |

Auth: `Authorization: Bearer <BUILDER_API_KEY>` on every request.

## Platform Integration

All modified API routes check `process.env.BUILDER_URL`:
- **If set:** HTTP POST to builder, return response to client
- **If not set:** Dynamic `import()` of local modules as fallback for local dev

Modified routes: `/api/generate`, `/api/generate/[id]/iterate`, `/api/generate/[id]/preview`, `/api/organizations/[slug]/apps/[appId]/deploy`

## Environment Variables

**Builder (Fly.io secrets):**
- `ANTHROPIC_API_KEY` — Claude Code CLI
- `DATABASE_URL` — Turso URL
- `TURSO_AUTH_TOKEN` — Turso auth
- `FLY_API_TOKEN` — org-level token for deploying generated apps
- `BUILDER_API_KEY` — shared secret for platform→builder auth

**Platform (Vercel env vars):**
- `BUILDER_URL` — `https://go4it-builder.fly.dev`
- `BUILDER_API_KEY` — same shared secret

## Infrastructure

- **VM:** shared-cpu-4x, 2048MB RAM (Claude Code CLI OOM'd on smaller)
- **Volume:** 10GB at `/data` (workspaces at `/data/apps/{id}/`)
- **Cost:** ~$5-7/mo compute (scale-to-zero) + $1.50/mo volume
- **Playbook + template:** baked into Docker image via `build.sh`

## Deploying the Builder

**Pushing to GitHub only auto-deploys the platform (Vercel). Builder must be manually redeployed via flyctl.**

```bash
# 1. Sync Go Suite apps into builder Docker context (if apps/ changed)
rsync -a --exclude='node_modules' --exclude='.next' --exclude='.prisma' \
  apps/gochat apps/gocrm apps/goledger apps/goschedule apps/project-management apps/orgs \
  builder/apps/

# 2. Deploy builder
cd builder
~/.fly/bin/flyctl deploy
```

The Dockerfile copies `apps/`, `playbook/`, `prisma/`, `src/` into the image. `.dockerignore` excludes `node_modules`, `.next`, `.prisma` from `apps/` copies.

## Docker Build Notes

- Prisma 7 requires `prisma.config.ts` which reads `DATABASE_URL` at generate time
- Dockerfile uses `RUN DATABASE_URL="file:./dummy.db" npx prisma generate` (only schema matters)
- `dotenv` package required because `prisma.config.ts` imports it

## Key Files

- `builder/src/index.ts` — Fastify server with auth middleware
- `builder/src/routes/generate.ts` — Generation endpoint
- `builder/src/routes/iterate.ts` — Iteration endpoint
- `builder/src/routes/preview.ts` — Preview management
- `builder/src/routes/deploy.ts` — Fly.io deployment
- `builder/src/lib/generator.ts` — Adapted from `src/lib/generator.ts` (Turso writes, `/data/apps` paths)
- `builder/src/lib/fly.ts` — Deployment orchestration
- `builder/src/lib/prisma.ts` — Prisma client with LibSQL adapter
- `builder/Dockerfile` — Node 20 slim + flyctl + playbook
- `builder/fly.toml` — Fly.io config
- `builder/build.sh` — Pre-build copy script
