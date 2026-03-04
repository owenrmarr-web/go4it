# Deploy Pipeline

How generated apps are built, stored, previewed, deployed, and updated.

---

## Source Lifecycle

```
User prompt → Claude Code CLI → source on builder disk (/data/apps/{id}/)
                                        ↓
                              prepareForPreview() validates build
                                        ↓
                              Upload zip to Vercel Blob (uploadBlobUrl)
                                        ↓
                              Deploy preview to Fly.io (PREVIEW_MODE=true)
```

**Source of truth is Vercel Blob.** Every successful generation and iteration uploads a zip of the validated source to `generated-apps/{generationId}/{timestamp}.zip`. The builder's disk is a working directory — it can be cleaned up safely once the blob exists.

### Source resolution priority (builder `/deploy` route)
1. `templateApp` — Go Suite apps use local source from `builder/apps/{name}/`
2. `generationId` → look up `GeneratedApp.sourceDir` on disk, fallback to `uploadBlobUrl`
3. `uploadBlobUrl` — direct blob download (developer-uploaded or generated apps after cleanup)

---

## Preview vs Production

Same source, different `PREVIEW_MODE` env var:

| Aspect | Preview | Production |
|--------|---------|------------|
| `PREVIEW_MODE` | `true` | `false` (or unset) |
| Auth | Fake session (auto-login as admin) | Real auth, SSO, team member provisioning |
| Data | Seed data from `prisma/seed.ts` | Fresh DB, users from `GO4IT_TEAM_MEMBERS` |
| TTL | 7 days (draft) or permanent (store) | Permanent |
| Dockerfile | Slim (pre-built `.next/standalone`) | Full (npm ci + build in Docker) |

Preview machines are created automatically during generation. Production machines are created when an org deploys via the account page.

---

## Deploy Types

### New deploy (no existing Fly app)
1. `flyctl apps create` + `flyctl volumes create data --size 1`
2. Set secrets (`AUTH_SECRET`, `GO4IT_TEAM_MEMBERS`, `GO4IT_ADMIN_PASSWORD`) with `--stage`
3. `flyctl deploy --dockerfile Dockerfile.fly`
4. `OrgApp.status` → `RUNNING`, `flyAppId` and `flyUrl` set

### Redeploy (existing Fly app)
Same pipeline as new deploy, but skips app/volume creation. Passes `existingFlyAppId` to reuse the same Fly machine. Data on the 1GB volume is preserved across redeploys.

### There is no "instant deploy" / `launchApp`
The old preview-to-production promotion via secret flip was removed. All deploys go through `deployApp()` with a full Docker rebuild. This ensures infra patches are applied and the Dockerfile is consistent.

---

## Infrastructure Versioning

### Template version
- `playbook/upgrades.json` tracks `currentInfraVersion` (currently 2)
- New apps get version 2 automatically (baked into `playbook/template/src/lib/go4it.ts`)
- `upgradeTemplateInfra()` in `builder/src/lib/fly.ts` patches older apps (v0/v1) to v2

### What `upgradeTemplateInfra` patches (v0/v1 → v2)
- `isAssigned` field + `AccessRequest` model in Prisma schema
- Auth blocking for unassigned users
- SSO page + team-sync endpoint + access-request endpoint
- Dark mode CSS tokens + ThemeToggle component
- FOUC prevention script in layout
- Infra version marker in `src/lib/go4it.ts`

### When patches run
- **Generation**: Not needed — template is already at v2
- **Preview rebuilds** (`/deploy-preview`, `/redeploy-preview-template`): Yes, `upgradeTemplateInfra()` runs
- **Production deploys** (`deployApp()`): Yes, `upgradeTemplateInfra()` runs (idempotent, skips if already v2+)
- **Team sync**: No patches — `sync-all-apps.ts` only pushes user roster

### DB tracking
- `OrgApp.deployedInfraVersion` records the version at deploy time
- Read from `src/lib/go4it.ts` → `GO4IT_TEMPLATE_VERSION` constant after patches

---

## Go Suite Apps vs AI-Generated Apps

| Aspect | Go Suite | AI-Generated |
|--------|----------|-------------|
| Source | `builder/apps/{name}/` (git-tracked) | Vercel Blob (`uploadBlobUrl`) |
| Identified by | `templateApp` param in deploy | `generationId` param in deploy |
| Editable | Via code changes in the repo | Via iteration (Claude CLI `--continue`) |
| Schema in DB | `App.isGoSuite = true` | `App.isGoSuite = false` |

The `GO_SUITE_TEMPLATE_MAP` in redeploy scripts maps App titles to template directory names.

---

## Redeploy Scripts

All in `prisma/scripts/redeploy/`. Run with `npx tsx <script>` with Turso env vars set.

| Script | What it does | When to use |
|--------|-------------|-------------|
| `redeploy-apps.ts` | POSTs to builder `/deploy` for every RUNNING OrgApp | After template/infra changes that affect production apps |
| `redeploy-previews.ts` | POSTs to builder `/redeploy-preview-template` for Go Suite previews | After Go Suite source code changes |
| `sync-all-apps.ts` | POSTs to each app's `/api/team-sync` with HMAC | After team member changes (no redeploy needed) |
| `reset-previews.ts` | Clears preview fields in DB for specific apps | After manually destroying preview machines |

### Batch update workflow (template change)
1. Make changes in `builder/apps/{name}/` and/or `playbook/template/`
2. Commit and push to main
3. `cd builder && bash build.sh && flyctl deploy --remote-only` (rebuild builder — `build.sh` copies prisma schema + playbook into the builder directory, then `flyctl deploy` bakes updated app sources into the Docker image)
4. `npx tsx prisma/scripts/redeploy/redeploy-previews.ts` (update store previews)
5. `npx tsx prisma/scripts/redeploy/redeploy-apps.ts` (update production apps)
6. **If you changed fields that come from the platform** (e.g. user profile fields like `profileColor`), also run `npx tsx prisma/scripts/redeploy/sync-all-apps.ts` to push fresh data

**Important:** Step 3 is required because the builder's Docker image bakes Go Suite app sources at build time (`COPY apps ./apps` in the Dockerfile). Without rebuilding the builder, redeploys will use the old source. Pushing to GitHub only auto-deploys the platform (Vercel) — the builder must be manually redeployed.

For UI-only changes (CSS, layout, component markup), steps 1-5 are sufficient. The SQLite DB on each app's volume is preserved across redeploys — `prisma db push` in `start.sh` only applies schema diffs.

---

## Key Files

| File | Role |
|------|------|
| `builder/src/lib/generator.ts` | Claude Code CLI spawning, `prepareForPreview()`, blob upload |
| `builder/src/lib/fly.ts` | `deployApp()`, `deployPreviewApp()`, `upgradeTemplateInfra()`, Dockerfile generators |
| `builder/src/lib/blob.ts` | `uploadSourceToBlob()`, `downloadAndExtractBlob()` |
| `builder/src/routes/deploy.ts` | POST `/deploy` — source resolution → `deployApp()` |
| `builder/src/routes/deploy-preview.ts` | POST `/deploy-preview` — preview pipeline |
| `builder/src/routes/upload-source.ts` | POST `/upload-source` — backfill blob URLs |
| `src/app/api/organizations/[slug]/apps/[appId]/deploy/route.ts` | Platform deploy API |
| `src/lib/fly.ts` | Platform-side `deployApp()` (local dev only) |
| `prisma/scripts/redeploy/` | Batch redeploy/sync scripts |
| `playbook/upgrades.json` | Infrastructure version definitions |

---

## Troubleshooting

### Source not found on deploy
The builder checks `GeneratedApp.sourceDir` on disk first, then falls back to `uploadBlobUrl`. If both are missing:
- For Go Suite apps: ensure `templateApp` is passed (redeploy scripts handle this)
- For generated apps: source may have been cleaned up before blob upload was implemented. Re-generate the app.

### Deploy fails with build errors
`deployApp()` builds from source inside Docker. If the build fails:
1. Check builder logs: `flyctl logs --app go4it-builder`
2. The app's source may have TypeScript errors — iterate on it via `/create`
3. Prisma schema errors are common — `upgradeTemplateInfra` may have failed

### Infra version mismatch
Query `OrgApp.deployedInfraVersion` in Turso. If it's less than `playbook/upgrades.json`'s `currentInfraVersion`, redeploy the app — `upgradeTemplateInfra` will patch it.

### Preview machine expired
Draft previews have a 7-day TTL. The hourly cleanup destroys expired machines but preserves source. Re-deploy a preview from the account page or regenerate.
