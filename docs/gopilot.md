# GoPilot AI Assistant

GoPilot is GO4IT's AI assistant that lets org members query data across all their deployed apps using plain English.

---

## Architecture Overview

```
Portal Page ([slug]/page.tsx)
  └─ ChatPanel (inline, left side of portal)
       └─ POST /api/portal/[slug]/chat (SSE stream)
            ├─ discoverOrgApps() → fetch each app's capabilities
            ├─ Claude Sonnet 4.5 with tool_use
            │   └─ query_app_data(app, query) → POST /api/ai-query on deployed app
            ├─ Save messages to Conversation/ChatMessage tables
            ├─ Generate title (Haiku 4.5)
            └─ Track usage (AIUsage table, per-org daily bucket)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/portal/[slug]/chat/route.ts` | Main chat endpoint, SSE streaming, conversation persistence |
| `src/lib/ai-assistant.ts` | AI provider, tool execution, app discovery, usage tracking |
| `src/components/portal/ChatPanel.tsx` | Full chat UI: conversations, streaming, tool visualization, limit modal |
| `src/lib/gopilot-tiers.ts` | Tier definitions (Free/Starter/Pro/Unlimited), price ID mapping |
| `src/components/GoPilotTierPicker.tsx` | Tier selection cards, calls subscribe API |
| `src/app/api/portal/[slug]/gopilot/subscribe/route.ts` | Creates Stripe Checkout session for tier upgrade |
| `src/app/api/webhooks/stripe/route.ts` | Handles subscription lifecycle (activate, switch, cancel) |
| `src/app/[slug]/page.tsx` | Portal page, mounts ChatPanel with suggested prompts |

---

## Cross-App Queries

GoPilot can query any deployed app in the org. Each generated app exposes an `/api/ai-query` endpoint:

- **GET** → Returns `{ capabilities: ["list_contacts", "open_deals", ...] }`
- **POST** `{ query: "list_contacts" }` → Returns `{ data: { type, items, summary } }`

Authentication uses `x-go4it-secret` header for app-to-app calls. The `GO4IT_ORG_SECRET` env var must be set on deployed apps.

**Tool schema sent to Claude:**
```
query_app_data(app: string, query: string)
```

Claude decides which app to query based on the user's question and available capabilities. Max 3 tool-use iterations per message.

Capabilities are cached for 5 minutes per app (`discoverOrgApps()` in `ai-assistant.ts`).

---

## Chat Route (`/api/portal/[slug]/chat`)

- `maxDuration = 60` (Vercel Pro)
- Loads last 20 messages for conversation context
- Streams response via SSE with event types: `conversation`, `usage`, `text`, `tool_start`, `tool_result`, `status`, `error`, `done`, `title`
- Saves user and assistant messages to `ChatMessage` table (tool calls stored as JSON)
- Generates conversation title asynchronously using Haiku 4.5

**Critical implementation note:** Never call `stream.finalMessage()` inside the `for await` loop — causes deadlock. Collect tool calls during stream, execute after loop completes.

---

## Conversation Management

**API Routes:**
- `GET /api/portal/[slug]/chat/conversations` — List user's conversations
- `GET /api/portal/[slug]/chat/[conversationId]` — Load messages
- `PATCH /api/portal/[slug]/chat/[conversationId]` — Rename conversation
- `DELETE /api/portal/[slug]/chat/[conversationId]` — Delete conversation

**Database Models:**
- `Conversation` — id, organizationId, userId, title, timestamps
- `ChatMessage` — id, conversationId, role (user/assistant), content, toolCalls (JSON)
- `AIUsage` — organizationId + date (YYYY-MM-DD) composite unique, queryCount

---

## Usage Limits & Tiers

Daily query limits are enforced per organization, bucketed by ISO date string.

| Tier | Daily Limit | Price |
|------|------------|-------|
| Free | 10 | $0/mo |
| Starter | 50 | $25/mo |
| Pro | 100 | $45/mo |
| Unlimited | ∞ | $95/mo |

**Enforcement flow:**
1. `checkUsageLimit(orgId)` queries `Organization.gopilotTier` and `AIUsage` table
2. Returns `{ allowed, used, limit, tier }`
3. If at limit, chat route sends `limitReached` SSE event → ChatPanel shows upgrade modal
4. `incrementUsage(orgId)` upserts `AIUsage` record after each successful query

**Tier config:** `src/lib/gopilot-tiers.ts` — shared constants used by both frontend (tier cards) and backend (limit enforcement).

---

## Stripe Subscription Flow

### Upgrade Flow
1. User clicks "Upgrade to Pro" on account page → opens modal with `GoPilotTierPicker`
2. User selects tier → `POST /api/portal/{slug}/gopilot/subscribe` with `{ tier }`
3. Route validates auth (OWNER/ADMIN only), creates Stripe customer if needed
4. Creates Stripe Checkout Session with metadata: `{ orgId, orgSlug, productType: "gopilot", gopilotTier }`
5. Returns `{ url }` → client redirects to Stripe hosted checkout
6. User completes payment → redirects to `/{slug}?upgraded=true`
7. Webhook (`checkout.session.completed`) → updates `Organization.gopilotTier` and `gopilotStripeSubId`

### Tier Switching
- When switching tiers, the old subscription is canceled **only after** the new checkout completes (in the webhook, not at checkout initiation)
- This prevents leaving users with no subscription if they abandon checkout

### Cancellation
- `customer.subscription.updated` (status = canceled/unpaid) or `customer.subscription.deleted` → resets `gopilotTier` to `FREE`, clears `gopilotStripeSubId`

### Organization Fields
```prisma
gopilotTier        String   @default("FREE")  // FREE | STARTER | PRO | UNLIMITED
gopilotStripeSubId String?                     // Separate from app hosting stripeSubscriptionId
```

### Environment Variables
```
STRIPE_GOPILOT_STARTER=price_...
STRIPE_GOPILOT_PRO=price_...
STRIPE_GOPILOT_UNLIMITED=price_...
```

---

## UI Integration Points

### Account Page (`/account`)
- GoPilot card in 2x2 action grid → "Upgrade to Pro" button → opens upgrade modal
- Modal includes value props (Ask Anything, Instant Insights, Secure & Private) + 4-tier picker
- OWNER/ADMIN see tier picker; MEMBER sees "Open GoPilot" link

### Portal Page (`/[slug]`)
- ChatPanel mounted inline on left side (55% width desktop)
- Suggested prompts generated dynamically from deployed app categories
- Usage counter in input area: `{used}/{limit}` with visual warnings
- Limit modal with `GoPilotTierPicker` for admins, "contact admin" for members

### Portal Limit Modal (ChatPanel)
- Triggered when daily limit reached or user clicks "Limit reached" badge
- OWNER/ADMIN: shows `GoPilotTierPicker compact` with tier cards
- MEMBER: shows "Contact your organization owner or admin" message

---

## Models (Anthropic)

- **Chat responses:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`)
- **Title generation:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **SDK:** `@anthropic-ai/sdk` — must pass `apiKey` explicitly on Vercel (auto-detection fails in serverless)

---

## Unit Economics

### API Cost Per Query (Estimated)

Sonnet 4.5 pricing: **$3/MTok input, $15/MTok output**

| Query Type | Input Tokens | Output Tokens | Cost |
|-----------|-------------|--------------|------|
| Simple (no tools) | ~3,000 | ~500 | ~$0.017 |
| With tool use (1-2 iterations) | ~6,000 | ~1,000 | ~$0.033 |
| **Blended average** (~40% use tools) | — | — | **~$0.025** |

Title generation via Haiku adds ~$0.0002/query (negligible).

Longer conversations increase input tokens (loads last 20 messages for context). Heavy users may average $0.03-0.05/query.

### Tier Margin Analysis

Assumes 30 days/month. "Typical" = 30% utilization (industry average for SaaS tools).

| Tier | Price | Max Queries/mo | Max Cost | Typical Queries/mo | Typical Cost | Typical Margin |
|------|-------|---------------|----------|-------------------|-------------|----------------|
| Free | $0 | 300 | $7.50 | 90 | $2.25 | -$2.25 (loss leader) |
| Starter | $25 | 1,500 | $37.50 | 450 | $11.25 | **$13.75 (55%)** |
| Pro | $45 | 3,000 | $75.00 | 900 | $22.50 | **$22.50 (50%)** |
| Unlimited | $95 | ∞ | ∞ | ~1,350* | $33.75 | **$61.25 (64%)** |

*Unlimited estimate assumes ~45 queries/day average usage.

### Risk Scenarios

- **Max usage on Starter/Pro:** Negative margin ($25 revenue vs $37.50 cost at 100% utilization). Mitigated by the fact that sustained max usage across all days is rare.
- **Unlimited heavy user:** A power user doing 200+ queries/day could cost $150+/mo against $95 revenue. Monitor via `AIUsage` table; consider soft caps or usage alerts if this becomes an issue.
- **Free tier cost:** At scale, 10 free queries/day across many orgs adds up. This is intentional — conversion to paid tiers is the goal.

### Levers for Margin Improvement

1. **Model switching:** Use Haiku for simple queries, Sonnet only for complex/tool-use queries
2. **Caching:** Cache common queries (app capabilities already cached 5min)
3. **Context pruning:** Summarize old messages instead of sending full 20-message history
4. **Prompt optimization:** Reduce system prompt size
5. **Batch pricing:** Anthropic offers discounted batch API rates for non-real-time workloads
