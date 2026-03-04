# GoMailer — App Spec

## 1. Identity

```
App Name: GoMailer
Emoji: 📧
Category: Marketing / Email
Tagline: Email campaigns, newsletters, and contact list management for small businesses
Tags: email, marketing, campaigns, newsletters, contacts, templates, small-business
```

## 2. Domain Boundaries

```
OWNS: Email campaigns, newsletters, contact lists, email templates, send history, subscriber management
DOES NOT OWN: Customer contacts/deals (GoCRM), internal team messaging (GoChat), support tickets (GoSupport)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### ContactList

A named group of subscribers for targeting campaigns.

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| description | String? | |
| color | String | @default("#6366f1"), for UI badges |

Relations: Subscriber (one-to-many), Campaign (one-to-many)

#### Subscriber

An email contact within a list. Separate from GoCRM contacts — these are marketing subscribers.

| Field | Type | Notes |
|-------|------|-------|
| email | String | Required |
| name | String? | |
| status | String | @default("ACTIVE"), values: ACTIVE, UNSUBSCRIBED, BOUNCED |
| subscribedAt | DateTime | @default(now()) |
| unsubscribedAt | DateTime? | |
| listId | String | FK → ContactList |

Relations: ContactList (many-to-one)

Unique constraint: `@@unique([email, listId])` — no duplicate emails per list

#### Template

Reusable email templates for campaigns.

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| subject | String | Required, email subject line |
| body | String | Required, email body content (supports multi-line text) |
| category | String | @default("GENERAL"), values: GENERAL, NEWSLETTER, PROMOTION, ANNOUNCEMENT, WELCOME, OTHER |

Relations: Campaign (one-to-many)

#### Campaign

An email send — one campaign targets one list using one template.

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| subject | String | Required, can override template subject |
| body | String | Required, can override template body |
| status | String | @default("DRAFT"), values: DRAFT, SCHEDULED, SENDING, SENT, CANCELLED |
| listId | String | FK → ContactList |
| templateId | String? | FK → Template, optional — can compose from scratch |
| scheduledAt | DateTime? | If scheduled for future send |
| sentAt | DateTime? | When actually sent |
| recipientCount | Int | @default(0), number of subscribers at send time |
| openCount | Int | @default(0), simulated opens |
| clickCount | Int | @default(0), simulated clicks |
| bounceCount | Int | @default(0), simulated bounces |

Relations: ContactList (many-to-one), Template (many-to-one, optional), SendLog (one-to-many)

#### SendLog

Record of each individual email sent in a campaign. Immutable audit trail.

| Field | Type | Notes |
|-------|------|-------|
| campaignId | String | FK → Campaign |
| subscriberEmail | String | Email address at send time |
| subscriberName | String? | Name at send time |
| status | String | @default("DELIVERED"), values: DELIVERED, OPENED, CLICKED, BOUNCED, FAILED |
| sentAt | DateTime | @default(now()) |
| openedAt | DateTime? | |
| clickedAt | DateTime? | |

Relations: Campaign (many-to-one)

No edit or delete for SendLog — immutable send history.

#### User relation fields to add

```
contactLists   ContactList[]
subscribers    Subscriber[]
templates      Template[]
campaigns      Campaign[]
sendLogs       SendLog[]
```

## 4. Navigation

```
navItems:
  - Dashboard    /              HomeIcon
  - Campaigns    /campaigns     EnvelopeIcon
  - Templates    /templates     DocumentIcon
  - Lists        /lists         UsersIcon
  - Send History /history       ListIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Total Subscribers (ACTIVE across all lists), Campaigns Sent (this month), Avg Open Rate (openCount/recipientCount across sent campaigns), Total Lists
- **Recent campaigns**: Last 5 campaigns with name, status badge, send date, recipient count, open rate
- **List growth**: Subscriber count per list with active/unsubscribed breakdown
- **Upcoming scheduled**: Campaigns with SCHEDULED status and their scheduledAt date

#### Campaigns (`/campaigns`)

**List view:**
- Table columns: name, status (badge), list name, sent date (or scheduled date), recipient count, open rate %, click rate %
- Filter by status (tabs: All, Draft, Scheduled, Sent, Cancelled)
- Search by campaign name
- Sort by created date, sent date

**Detail view** (`/campaigns/[id]`):
- Campaign header: name, status badge, list name, template name
- Content preview: subject line and body
- Performance stats (when SENT): recipient count, open count, click count, bounce count, open rate %, click rate %
- Send log table: subscriber email, name, status (badge), sent time, opened time, clicked time
- Actions based on status:
  - DRAFT: Edit, Send Now, Schedule, Delete
  - SCHEDULED: Edit, Send Now, Cancel
  - SENT: View only (stats + send log)

**Create/Edit** (page):
- Fields: name*, list (dropdown)*, template (dropdown, optional — pre-fills subject and body), subject*, body* (textarea)
- Schedule option: send now or schedule for future date/time
- Preview: show how the email will look

**Send simulation:** When "Send Now" is clicked:
1. Count ACTIVE subscribers in the selected list
2. Set recipientCount, status → SENDING → SENT, sentAt = now
3. Create SendLog entries for each active subscriber
4. Simulate: 60-80% DELIVERED→OPENED, 20-40% OPENED→CLICKED, 2-5% BOUNCED
5. Update campaign openCount, clickCount, bounceCount

**Delete:** Only when DRAFT or SCHEDULED — ConfirmDialog

#### Templates (`/templates`)

**List view:**
- Card grid: name, category badge, subject preview, body preview (first 100 chars), last updated
- Search by name or subject
- Filter by category (dropdown)

**Create/Edit** (modal or page):
- Fields: name*, subject*, body* (textarea), category (dropdown)

**Delete:** ConfirmDialog — warn if template is used by campaigns

#### Lists (`/lists`)

**List view:**
- Card grid: list name, color dot, subscriber count (active/total), description
- Search by name

**Detail view** (`/lists/[id]`):
- List info card with edit button
- Subscriber table: email, name, status (badge), subscribed date, unsubscribed date
- Search subscribers by email or name
- Filter by status (tabs: All, Active, Unsubscribed, Bounced)
- Add subscriber button, bulk import (comma-separated emails)
- Actions per subscriber: unsubscribe, resubscribe, remove

**Create/Edit** (modal):
- Fields: name*, description, color

**Delete:** ConfirmDialog — warn about subscriber count

#### Subscribers (managed within Lists)

**Add subscriber** (modal from list detail):
- Fields: email*, name
- Validates no duplicate in same list

**Bulk add** (modal):
- Textarea for comma-separated or newline-separated emails
- Creates ACTIVE subscribers, skips duplicates

**Unsubscribe:** Sets status to UNSUBSCRIBED, sets unsubscribedAt

**Remove:** Deletes subscriber record entirely — ConfirmDialog

#### Send History (`/history`)

**List view:**
- Table columns: campaign name, subscriber email, status (badge), sent time, opened time, clicked time
- Filter by status (dropdown: All, Delivered, Opened, Clicked, Bounced, Failed)
- Search by email or campaign name
- Date range filter
- Sort by sent time (newest first)

Read-only — no create/edit/delete. This is an intentional exception to full CRUD.

#### Settings (`/settings`)

- Default "From" name
- Default reply-to email
- Unsubscribe message text
- Default template category

## 6. Status Workflows

#### Campaign Status
```
DRAFT (default/gray) → SCHEDULED (info/blue) → SENDING (warning/amber) → SENT (success/green)
DRAFT → SENDING → SENT (immediate send, no schedule)
SCHEDULED → CANCELLED (danger/red)
DRAFT → CANCELLED
```
- SENDING is a brief transitional state during send simulation
- SENT is final — cannot edit or resend

#### Subscriber Status
```
ACTIVE (success/green) → UNSUBSCRIBED (default/gray)
ACTIVE → BOUNCED (danger/red)
UNSUBSCRIBED → ACTIVE (resubscribe)
```

#### Send Log Status (display only)
```
DELIVERED (success/green)
OPENED (info/blue)
CLICKED (info/blue)
BOUNCED (danger/red)
FAILED (danger/red)
```

#### Template Category (display only)
```
GENERAL (default/gray)
NEWSLETTER (info/blue)
PROMOTION (warning/amber)
ANNOUNCEMENT (info/blue)
WELCOME (success/green)
OTHER (default/gray)
```

## 7. Seed Data

**Business:** "Coastal Coffee Roasters" — specialty coffee company with online store and wholesale

- **3 Contact Lists:** Newsletter Subscribers (45 active), Wholesale Partners (12 active), VIP Customers (28 active)
  - Use realistic subscriber counts but only seed 5-6 subscribers per list with actual records
- **18 Subscribers:** 5-6 per list
  - Mix: 14 ACTIVE, 3 UNSUBSCRIBED, 1 BOUNCED
  - Realistic names and emails
- **4 Templates:**
  - "Monthly Newsletter" (NEWSLETTER)
  - "Flash Sale" (PROMOTION)
  - "New Product Announcement" (ANNOUNCEMENT)
  - "Welcome Email" (WELCOME)
- **6 Campaigns:**
  - 1 DRAFT (upcoming holiday campaign)
  - 1 SCHEDULED (next week's newsletter)
  - 3 SENT (with performance stats — varied open/click rates)
  - 1 CANCELLED
- **SendLog entries:** 8-10 per SENT campaign
  - Mix of statuses: mostly DELIVERED/OPENED, some CLICKED, 1-2 BOUNCED
  - Timestamps spread over last 30 days

## 8. AI Query Handlers

```
Handlers:
  - list_campaigns: Recent campaigns with name, status, sentAt, recipientCount, openCount
  - campaign_stats: Performance for sent campaigns — name, open rate, click rate, bounce rate
  - list_contact_lists: All contact lists with name, subscriberCount, description
  - list_subscribers: Active subscribers across all lists with email, name, listName
  - subscriber_count: Total active subscribers per list
  - recent_sends: Send logs from last 7 days with campaign name, email, status
  - list_templates: All templates with name, category, subject
```
