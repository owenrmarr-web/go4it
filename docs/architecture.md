# Architecture

System architecture, service boundaries, and key design decisions.

---

## Service Map

```
Browser  ──HTTPS──>  Vercel (Next.js platform)
                        │
                        ├── Turso DB (LibSQL) ── reads/writes user, app, org data
                        │
                        └── HTTP ──> Builder Service (Fly.io Fastify)
                                        │
                                        ├── Turso DB ── writes generation progress
                                        ├── Claude Code CLI ── generates apps
                                        └── flyctl ── deploys apps to Fly.io

Deployed Apps  ── Fly.io machines (one per org-app, SQLite + volume)
```

## Key Decisions

- **Deployed app UX:** Separate browser tabs per app (not embedded iframes). Each app is a full Next.js deployment on its own Fly.io machine. Fly.io suspend/resume is ~2-3s. Future optimization: pre-warm apps by hitting health endpoints when Account page loads.
- **Deployment target:** Fly.io (not AWS) — scale-to-zero, built-in subdomain routing, simpler ops.
- **AI engine:** Claude Code CLI invoked as subprocess (not Agent SDK or raw API).
- **App builder playbook:** `playbook/CLAUDE.md` copied into each workspace — ensures consistent tech stack.
- **Code storage:** Local file system during generation. Cloudflare R2 archival planned.
- **Progress UX:** Step-based indicators via SSE (not raw terminal output).
- **App deployment:** flyctl CLI spawned as subprocess from `src/lib/fly.ts`. Generates fly.toml, Dockerfile.fly, start.sh per app, then runs `flyctl deploy`. Each app gets a 1GB volume for SQLite.
- **Deploy-time template upgrade:** `upgradeTemplateInfra(sourceDir)` runs in both `src/lib/fly.ts` and `builder/src/lib/fly.ts` during deploy prep. Patches older apps with latest template infrastructure (schema fields, auth checks, API routes). Idempotent. To add future upgrades, extend the function with new patch blocks. **Always test patches against ALL existing app source code before deploying** — source code varies because Claude generates it.

## Cost Model

| Service | Fixed/Monthly | Per-App Variable | Notes |
|---|---|---|---|
| Vercel (Pro) | $20/mo | — | Platform hosting, auto-deploy from GitHub |
| Turso | Free tier (9GB, 500 DBs) | — | Upgrade at ~$29/mo if needed |
| Fly.io | — | ~$2.68/mo/app (shared-cpu-1x 256MB + 1GB vol) | Scale-to-zero; trial needs credit card |
| Anthropic API | — | ~$0.30–$0.80/generation (sonnet, ~5K tokens) | Only for AI app generation |
| Resend | Free tier (3K emails/mo) | — | Team invite emails |
| Squarespace | $20/yr | — | Domain registration (go4it.live) |
| GitHub | Free | — | Public repo |

**Revenue:** $5/app/mo + $1/seat/app/mo.
