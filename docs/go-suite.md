# Go Suite

GO4IT's first-party app ecosystem. Each app owns a single domain and stays focused. Cross-app data queries connect them.

---

## App Stream

| App | Domain | Owns | Status |
|-----|--------|------|--------|
| **GoCRM** | Relationships | Contacts, companies, interaction history, relationship stages, tags, tasks/follow-ups, lightweight deal pipeline | Done |
| **GoSchedule** | Scheduling | Appointments, availability, bookings, calendar (includes customer-facing booking page) | Done |
| **GoProject** | Project management | Projects, tasks, milestones, assignments, progress tracking | Done |
| **GoChat** | Messaging | Team messaging, channels, direct messages, AI coworker | Done |
| **GoLedger** | Money | Invoices (B2B + B2C), estimates, payments (manual + Stripe), expenses, recurring invoices, financial reports (P&L, AR aging), QBO CSV export, public invoice payment page | Building |
| **GoSales** | Sales performance | Advanced pipeline, forecasting, rep performance, commissions, quota tracking | Planned |

## Domain Boundaries

- **CRM owns relationships** — who your customers are and every touchpoint. Does NOT own financials, scheduling, project management, or sales analytics.
- **Lightweight deals in CRM** — simple pipeline (Interested → Quoted → Committed → Won/Lost) for tracking active opportunities. No forecasting, weighted probabilities, or rep leaderboards — that's GoSales.
- **Schedule owns booking** — services, availability, appointments, customer-facing booking page. CRM surfaces appointment data via cross-app queries but doesn't duplicate.
- **Project owns work tracking** — projects, tasks, milestones, assignments. CRM can surface task counts per contact.
- **Chat owns messaging** — team channels, DMs, AI coworker. Other apps surface data via ai-query endpoint.
- **Ledger owns money** — invoices, estimates, payments, expenses, recurring invoices, financial reports. CRM surfaces payment history per contact. Supports Stripe online payments + QBO CSV export.
- **GoSales owns sales analytics** — advanced pipeline, forecasting, rep performance.

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
│  │  GoLedger: payment history, balances        │    │
│  │  GoSales: advanced deal analytics           │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

This is the GO4IT differentiator — businesses compose exactly the tools they need, and they talk to each other natively.

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
