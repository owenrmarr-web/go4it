# Completed Work

Archive of finished features and fixes. Reference when debugging regressions or understanding how something was implemented.

---

## Features (newest first)

### Preview Page with Floating Add to Org Bar (2026-03-14)
Added `/preview/[id]` page that wraps app previews in a full-screen iframe with a frosted-glass action bar. Users can Save and Add to Org directly from the preview without returning to the marketplace. AppCard preview links now navigate to this page instead of opening Fly.io URLs in new tabs. Extracted `handleAddToOrg` into shared `useAddToOrg` hook. Added `GET /api/apps/[id]` endpoint. See `docs/ui-and-theming.md`.

### Go Suite Marketplace — All 12 Apps (2026-03-04)
Built, published, and deployed all 12 Go Suite apps with live preview machines. Wrote structured specs for 6 new apps (GoInvoice, GoSupport, GoMailer, GoDocs, GoForms, GoWiki) in `playbook/specs/`. Generated all 6 via Claude Code CLI with the playbook. Validated builds, created `go4it.json` manifests, published to marketplace DB via `publish-gosuite.ts`, and deployed preview machines via `deploy-gosuite-previews.ts`. Sequential deploys required after concurrent batch overwhelmed the builder. GoLedger/GoExpense remain as legacy entries but GoInvoice replaces GoLedger functionally.

### Avatar System — profileColor/profileEmoji (2026-03-03)
Added `profileColor` and `profileEmoji` to NextAuth session for sidebar avatars in deployed apps. Updated GoHR, GoInventory, GoChat, and the playbook template.

### GoChat iOS Capacitor (2026-02-24)
Wrapped GoChat in native iOS app via Capacitor 8. Remote URL approach: WKWebView loads deployed preview. Server-side push via `apns2`, SSE connection tracking for push-only-when-offline, client-side push registration + deep-links, SSE reconnection on resume from background. See `docs/go-suite.md` for details and remaining steps.

### Dark Mode (2026-02-23)
Added dark mode to all generated apps via template + `upgradeTemplateInfra` patches 12-17. Semantic tokens (`--g4-*`), FOUC prevention, ThemeToggle component. All 5 deployed apps redeployed. See `docs/ui-and-theming.md` for details.

### SSO for Deployed Apps (2026-02-22)
Platform "Visit" button passes signed JWT → deployed app `/sso` endpoint auto-signs user in. `upgradeTemplateInfra` patches 9-11. See `docs/auth-and-teams.md`.

### Consumer-Facing Public Pages / B2B2C (2026-02-21)
GoSchedule proved the model: public booking page (no auth) for end customers + authenticated business dashboard. Template for future apps with customer-facing pages.

### Multi-Org Account Page (2026-02-21)
Tabbed org navigation, pill-style tabs with role badges, URL state via `?org={slug}`, `ActiveOrgContext`, credential sync for all assigned members. See `docs/auth-and-teams.md`.

### Member Onboarding Flow (2026-02-21)
Streamlined `/join/[token]` page. Smart routing, emoji avatar system, role-based account page visibility. See `docs/auth-and-teams.md`.

### Forgot Password (2026-02-21)
Full reset flow via email. Anti-enumeration, 1-hour expiry, branded template. See `docs/auth-and-teams.md`.

### Real-Time Permission Sync (2026-02-21)
Direct HTTP to deployed app `/api/team-sync` with HMAC-SHA256. Session-level enforcement blocks removed users mid-session. See `docs/auth-and-teams.md`.

### UI Polish (2026-02-19)
Frosted glass preview pill on app cards, Save/Add buttons above description, active nav highlighting, toast positioning, pricing calculator Number of Apps input.

### Versioning & Draft/Store Preview Separation (2026-02-19)
`App.previewFlyAppId` for stable store preview. Draft → store promotion on publish. 7-day draft expiry. "Apps I've Created" section.

### Investor Deck (2026-02-19)
Full pitch deck at `/deck`. See `docs/ui-and-theming.md`.

### Pricing Calculator (2026-02-19)
Interactive cost comparison at `/pricing`. See `docs/ui-and-theming.md`.

### Team Member Sync Without Redeploy (2026-02-18)
`syncTeamMembersToFly()` updates Fly.io secret, triggers machine restart, re-provisions users. See `docs/auth-and-teams.md`.

### Persistent App Previews in Marketplace (2026-02-18)
Published apps keep preview machines indefinitely. Cleanup skips published apps. AppCard shows "Try it" button.

### Instant Launch via Secret Flip (2026-02-18)
Removed redundant `flyctl machines restart` (double-restart race). Added health check polling after secret flip.

### Email Verification (2026-02-18)
Full verification flow on signup. Unverified users blocked from sign-in. See `docs/auth-and-teams.md`.

### SSE Auto-Reconnect + Create Page Preview URL Fix (2026-02-18)
Exponential backoff reconnection, status API fallback, manual preview button for failed auto-deploy.

### Playbook 3-Tier Rewrite (2026-02-16)
Restructured from prescriptive rules to Tier 1 (infrastructure), Tier 2 (design tokens), Tier 3 (creative freedom). Old playbook saved as `playbook/CLAUDE_old.md`.

### Google OAuth Sign-In (2026-03-14)
Google provider added to NextAuth v5. New users redirected to `/auth/complete-profile` to fill in username, company, and profile data that Google doesn't provide. Account merging via `allowDangerousEmailAccountLinking`. Edge-safe `session` callback added to `auth.config.ts` so middleware can read `profileComplete`. Privacy policy page at `/privacy`. See `docs/auth-and-teams.md`.

### Admin Insights Tab (2026-03-14)
New `/api/admin/insights` endpoint aggregates `useCases`, `country`, and `createdAt` from User records. Admin page Insights tab shows: summary cards, 30-day signup column chart, use case horizontal bar chart, top countries bar chart. All CSS — no charting library.

## Fixes (newest first)

- **`gopilotTier` missing column (2026-03-14)** — `Organization.gopilotTier` was in Prisma schema but never migrated to Turso. `/api/account/org` was crashing silently. Fix: added `try/catch` to surface the error, then ran `ALTER TABLE Organization ADD COLUMN gopilotTier TEXT NOT NULL DEFAULT 'FREE'` directly against Turso.
- **Public page auth fix (2026-02-26)** — `isOrgPortal` regex matched single-segment public routes, blocking unauthenticated access. Added explicit `publicRoutes` list.
- **Seed data fixes (2026-02-16)** — Duplicate records, preview FK violation, seed bleed into production.
- **Playbook pitfalls (2026-02-16)** — Don't redefine Prisma types, no external theme libraries, generic package.json descriptions.
- **Create page auth flow (2026-02-16)** — View/type without auth, inline sign-in modal, sign-up redirects with callbackUrl.
- **Stale app cleanup (2026-02-16)** — Deleted old records from Turso via `prisma/cleanup-apps.ts`.
- **Auto-deploy pipeline (2026-02-15)** — Unified Dockerfile, fixed `COPY dev.db` path, consistent builds.
- **Auto-deploy pipeline fixes (2026-02-14)** — Premature progress updates, stale state, npm install ordering, build error detection, `.next/standalone` verification.
- **Resend API key in Vercel (2026-02-14)** — Wrong API key in Vercel env var. Updated, redeployed.
- **Auth modal (2026-02-13)** — Inline auth modal for heart/add interactions.
- **Color picker (2026-02-13)** — Overlay pattern for usable color pickers.
- **Builder preview stability (2026-02-13)** — Preview gated on COMPLETE status, middleware warning filtering, proper env vars.
- **Portal deploying status (2026-02-13)** — Show DEPLOYING apps with amber pulse animation.
- **Deployed app URLs (2026-02-10)** — Switched to `.fly.dev` URLs. Migrated DB records via `prisma/fix-fly-urls.ts`.
- **Production preview timeout (2026-02-10)** — Converted to async pattern (202 + polling) to avoid Vercel 60s limit.
- **Password management (2026-02-10)** — 6-char minimum, password change in Account Settings.
- **Universal admin account (2026-02-10)** — `admin@go4it.live` auto-provisioned in every deployed app.
