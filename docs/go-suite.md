# Go Suite

GO4IT's first-party app ecosystem. Each app owns a single domain and stays focused. Cross-app data queries connect them.

---

## App Lineup (12 apps)

| # | App | Category | Icon | Key Features | Status |
|---|-----|----------|------|-------------|--------|
| 1 | GoCRM | CRM / Sales | 🤝 | Contacts, companies, deals, pipeline, activity tracking | Live |
| 2 | GoProject | Project Management | 📋 | Projects, tasks, milestones, assignments, progress tracking | Live |
| 3 | GoSchedule | Scheduling | 📅 | Appointments, bookings, availability, customer booking page | Live |
| 4 | GoInventory | Inventory | 📦 | Products, stock levels, suppliers, purchase orders | Live |
| 5 | GoInvoice | Finance | 💰 | Invoices, estimates, payments, expenses, financial reports | Live |
| 6 | GoSupport | Helpdesk | 🎧 | Tickets, customer-facing KB, SLAs, satisfaction tracking | Live |
| 7 | GoHR | People / HR | 👥 | Directory, time-off, onboarding, docs, timekeeping, pay tracking | Live |
| 8 | GoChat | Chat | 💬 | Channels, DMs, file sharing, AI coworker | Live |
| 9 | GoMailer | Marketing | 📧 | Email campaigns, newsletters, contact lists, templates | Live |
| 10 | GoDocs | Documents | 📄 | Contracts, proposals, document storage, version tracking | Live |
| 11 | GoForms | Forms | 📝 | Custom forms, surveys, checklists, submission tracking | Live |
| 12 | GoWiki | Knowledge Base | 📚 | Internal SOPs, training docs, team wiki, search | Live |

**Status key:** Live = built, published to marketplace, and preview machine deployed on Fly.io.

All 12 apps are generated from structured spec files (`playbook/specs/{appname}.md`) using the playbook. Each has a `go4it.json` manifest in `builder/apps/{name}/`.

---

## Feature Boundaries

Each app owns its domain. This table prevents overlap during generation.

| App | Owns | Does NOT own |
|-----|------|-------------|
| GoCRM | Contacts, companies, deals, sales pipeline, activity log | Scheduling (GoSchedule), invoicing (GoInvoice), project tasks (GoProject) |
| GoProject | Projects, tasks, milestones, assignments, workload | CRM deals (GoCRM), timekeeping/hours (GoHR), messaging (GoChat) |
| GoSchedule | Appointments, provider availability, customer booking page | Employee time-off (GoHR), project deadlines (GoProject) |
| GoInventory | Products, categories, stock levels, suppliers, purchase orders, stock movements | Customer invoicing (GoInvoice), expense tracking (GoInvoice) |
| GoInvoice | Invoices, estimates, payments, expenses, AR/AP, financial reports, cross-app finance rollup | Inventory stock (GoInventory), employee pay (GoHR), deal tracking (GoCRM) |
| GoSupport | Tickets, knowledge base articles, SLAs, CSAT | Internal messaging (GoChat), internal wiki (GoWiki) |
| GoHR | Employee profiles (User extensions), departments, time-off, onboarding, documents, timekeeping, pay stubs | Actual payroll processing (external), customer contacts (GoCRM), internal chat (GoChat) |
| GoChat | Channels, DMs, threads, file sharing, AI coworker | Email campaigns (GoMailer), support tickets (GoSupport) |
| GoMailer | Email campaigns, newsletters, contact lists, templates, send history | Customer contacts/deals (GoCRM), internal messaging (GoChat) |
| GoDocs | Contracts, proposals, document storage, folders, version tracking | Internal SOPs/wiki (GoWiki), employee HR docs (GoHR) |
| GoForms | Form builder, surveys, checklists, submission tracking, response analytics | Support tickets (GoSupport), employee onboarding forms (GoHR) |
| GoWiki | Internal SOPs, training docs, team wiki, categories, search | Customer-facing KB (GoSupport), contracts/proposals (GoDocs) |

**Playbook constraint:** GoHR uses the User table directly for employee profiles (no separate Employee model). `isAssigned: true` = active team member.

---

## Generation Workflow

Each app is generated from two inputs:
1. `playbook/CLAUDE.md` — the playbook (how to build: styling, components, CRUD patterns, protected files)
2. `playbook/specs/{appname}.md` — the spec (what to build: entities, features, nav, seed data)

Spec format documented in `playbook/gosuite-prompt-template.md`.

Steps:
1. Copy `playbook/template/` to temp workspace
2. Place spec file as `SPEC.md` in workspace
3. Run Claude Code CLI — picks up `playbook/CLAUDE.md` + `SPEC.md`
4. Validate: `npm install && npx prisma generate && npm run build`
5. Copy result to `builder/apps/{name}/`
6. Run `publish-gosuite.ts` to register in marketplace

---

## Cross-App Data Flow

Apps in the same org query each other via `/api/ai-query` endpoint:

```
┌─────────────────────────────────────────────────────┐
│                  GoCRM (contact detail page)         │
│                                                     │
│  Native: contact info, activity timeline, deals     │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  "Connected Apps" panel (via ai-query API)  │    │
│  │                                             │    │
│  │  GoSchedule: upcoming/past appointments     │    │
│  │  GoInvoice: payment history, balances       │    │
│  │  GoInventory: order history                 │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

This is the GO4IT differentiator — businesses compose exactly the tools they need, and they talk to each other natively.

---

## GoChat iOS (Capacitor)

GoChat is wrapped as a native iOS app via Capacitor 8 using the **remote URL approach** (WKWebView loads deployed preview URL).

### Server-side push
- `PushDevice` model stores APNs tokens per user
- `POST/DELETE /api/push/register` for device token management
- `src/lib/push.ts` — APNs via `apns2` library (p8 key auth, stale token cleanup)
- Push triggers on channel + DM messages (only for users NOT connected via SSE)

### SSE connection tracking
- `src/lib/events.ts` — ref-counted `connectedSSEUsers` Map
- `trackSSEConnect`/`trackSSEDisconnect`/`isUserConnectedViaSSE`

### Client-side
- `src/hooks/usePushNotifications.ts` — Capacitor push registration, deep-links on notification tap
- `src/hooks/useSSE.ts` — reconnects EventSource on resume from background

### Remaining to complete
1. Install Xcode (requires macOS update)
2. Apple Developer account ($99/yr)
3. Create APNs p8 key → set env vars: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_BASE64`, `APNS_BUNDLE_ID=com.go4it.gochat`
4. Xcode: `cd builder/apps/gochat && npx cap open ios`
5. Configure signing + Push Notifications + Background Modes capabilities
6. Build to physical device, test end-to-end

### Key files
- `builder/apps/gochat/capacitor.config.ts`
- `builder/apps/gochat/prisma/schema.prisma` (PushDevice model)
- `builder/apps/gochat/src/lib/push.ts`
- `builder/apps/gochat/src/app/api/push/register/route.ts`
- `builder/apps/gochat/src/hooks/usePushNotifications.ts`
- `builder/apps/gochat/src/hooks/useSSE.ts`
- `builder/apps/gochat/src/lib/events.ts`
