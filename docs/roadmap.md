# Roadmap

Active next steps in priority order. See `docs/completed-work.md` for finished items.

---

1. **Payments integration (Stripe)** — Two purposes: (a) **Platform billing** — track per-user Fly.io usage, charge $5/app/mo + $1/seat/app/mo, (b) **In-app payments** — generated apps can collect payments from end customers via Stripe Checkout/Elements. Playbook update for Stripe payment flow template. Connect accounts for per-business payouts.

2. **Builder hardening** — Garbage collection for old workspaces, rate limiting, error logging/monitoring.

3. **Model selection toggle** — Let users choose Sonnet (fast/cheap) vs Opus (slower/higher quality) on Create page. Plan written but deferred. See `/Users/owenmarr/.claude/plans/reflective-tumbling-gizmo.md`.

4. **AI coworker Phase 2 — cross-app data queries** — GoChat exposes `/api/ai-query` endpoint. AI coworker queries other GO4IT apps for business answers. Apps communicate via Fly.io internal networking (`.internal` addresses). Requires: standardized query endpoint spec, auth between apps (shared org secret), response schema.

5. **AI coworker Phase 3 — proactive insights** — AI monitors cross-app data and surfaces insights in GoChat without being asked. Requires Phase 2 + scheduled polling/webhook system + notification routing.

6. **Fix custom subdomain DNS** — `*.go4it.live` CNAME points to `fly-global.fly.dev` which returns NXDOMAIN. Options: (a) per-app CNAME records via DNS API, (b) shared reverse-proxy Fly app for wildcard routing. Currently using `.fly.dev` URLs as workaround.

7. **Custom domains (phase 2)** — Support user-owned domains like `crm.mybusiness.com` (CNAME validation + Fly.io per-app certs).

8. **Cross-platform avatar/profile system** — Sync `profileColor`, `profileEmoji`, `image` from platform User model to deployed apps via `GO4IT_TEAM_MEMBERS` or team-sync endpoint. Playbook update for avatar rendering. Blanket update to all Go Suite apps.

9. **GoChat iOS completion** — Install Xcode, Apple Developer account ($99/yr), APNs p8 key, Xcode signing + capabilities, build to physical device, test push end-to-end.

10. **POS integration** — Connect to point-of-sale systems for payments, inventory sync, sales data. Priority: (1) **Square** — largest SMB base, free REST API, OAuth. (2) **Shopify POS** — GraphQL + REST. (3) **Clover** — REST. (4) **Toast** — requires partner approval. Start with Square OAuth pattern in playbook.
