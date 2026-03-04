# GoSupport — App Spec

## 1. Identity

```
App Name: GoSupport
Emoji: 🎧
Category: Support / Helpdesk
Tagline: Customer support tickets, knowledge base, and satisfaction tracking for small businesses
Tags: support, helpdesk, tickets, knowledge-base, customer-service, sla, small-business
```

## 2. Domain Boundaries

```
OWNS: Support tickets, knowledge base articles, SLA tracking, customer satisfaction (CSAT), canned responses
DOES NOT OWN: Internal team messaging (GoChat), internal wiki/SOPs (GoWiki), customer contacts/deals (GoCRM)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Ticket

| Field | Type | Notes |
|-------|------|-------|
| ticketNumber | String | Required, auto-generated (TK-001, TK-002...) |
| subject | String | Required |
| description | String | Required, initial message from customer |
| status | String | @default("OPEN"), values: OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED |
| priority | String | @default("MEDIUM"), values: LOW, MEDIUM, HIGH, URGENT |
| category | String | @default("GENERAL"), values: GENERAL, BILLING, TECHNICAL, FEATURE_REQUEST, BUG, OTHER |
| customerName | String | Required |
| customerEmail | String | Required |
| assignedToId | String? | FK → User, team member handling the ticket |
| resolvedAt | DateTime? | |
| closedAt | DateTime? | |
| satisfactionRating | Int? | 1-5 CSAT score |
| satisfactionComment | String? | |

Relations: User via assignedToId (many-to-one, named relation `@relation("TicketAssignee")`), TicketComment (one-to-many), TicketTag (one-to-many)

#### TicketComment

Internal notes and replies on a ticket.

| Field | Type | Notes |
|-------|------|-------|
| content | String | Required |
| isInternal | Boolean | @default(false), true = internal note (not visible to customer) |
| authorId | String? | FK → User, team member who wrote the comment |
| ticketId | String | FK → Ticket, onDelete: Cascade |

Relations: Ticket (many-to-one), User via authorId (many-to-one, named relation `@relation("CommentAuthor")`)

#### Tag

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, unique per user |
| color | String | @default("#6366f1"), hex color |

Relations: TicketTag (one-to-many)

#### TicketTag

Join table for Ticket ↔ Tag many-to-many.

| Field | Type | Notes |
|-------|------|-------|
| ticketId | String | FK → Ticket, onDelete: Cascade |
| tagId | String | FK → Tag, onDelete: Cascade |

Unique constraint: `@@unique([ticketId, tagId])`

Relations: Ticket (many-to-one), Tag (many-to-one)

#### KBArticle

Customer-facing knowledge base article.

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| slug | String | Required, URL-friendly, unique per user |
| content | String | Required, supports multi-line text / markdown |
| categoryId | String? | FK → KBCategory |
| status | String | @default("DRAFT"), values: DRAFT, PUBLISHED |
| viewCount | Int | @default(0) |
| helpfulCount | Int | @default(0) |
| notHelpfulCount | Int | @default(0) |

Relations: KBCategory (many-to-one)

#### KBCategory

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, unique per user |
| description | String? | |
| order | Int | @default(0), sort order |

Relations: KBArticle (one-to-many)

#### CannedResponse

Pre-written reply templates for common ticket responses.

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required, short name for quick selection |
| content | String | Required, the response text |
| category | String? | Optional grouping |

Relations: none

#### User relation fields to add

```
tickets                  Ticket[]
ticketAssignments        Ticket[]           @relation("TicketAssignee")
ticketCommentsOwned      TicketComment[]
ticketCommentsByAuthor   TicketComment[]    @relation("CommentAuthor")
tags                     Tag[]
ticketTags               TicketTag[]
kbArticles               KBArticle[]
kbCategories             KBCategory[]
cannedResponses          CannedResponse[]
```

## 4. Navigation

```
navItems:
  - Dashboard      /                HomeIcon
  - Tickets        /tickets         InboxIcon
  - Knowledge Base /kb              DocumentIcon
  - Canned Replies /canned          ChatBubbleIcon
  - Reports        /reports         ChartBarIcon
  - Settings       /settings        CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Open Tickets, Unassigned Tickets (no assignedToId), Avg Response Time (time from ticket creation to first comment), CSAT Score (average satisfactionRating)
- **Tickets by priority**: count breakdown — Low, Medium, High, Urgent
- **Recent tickets**: Last 5 tickets with subject, customer, priority badge, status badge, assigned to (UserAvatar)
- **Overdue / waiting**: Tickets in WAITING status for more than 48 hours

#### Tickets (`/tickets`)

**List view:**
- Table columns: ticket number, subject, customer name, priority (badge), status (badge), category, assigned to (UserAvatar or "Unassigned"), created date
- Filter by status (tabs: All, Open, In Progress, Waiting, Resolved, Closed)
- Filter by priority (dropdown)
- Filter by assigned to (dropdown — team members)
- Search by ticket number, subject, or customer name/email
- Sort by created date, priority, status

**Detail view** (`/tickets/[id]`):
- Ticket header: number, subject, priority badge, status badge, category badge
- Customer info: name, email
- Assignment: UserAvatar + dropdown to reassign
- Tags: displayed as colored pills, add/remove tags
- Description (original message)
- Comment thread: chronological list of comments
  - Internal notes styled differently (e.g., yellow background, "Internal Note" label)
  - Show author UserAvatar, name, timestamp
- Add comment form: textarea + toggle for internal note + insert canned response dropdown
- CSAT section (when RESOLVED or CLOSED): show rating stars and comment
- Actions based on status:
  - OPEN: Assign, Start (→IN_PROGRESS), Close
  - IN_PROGRESS: Set Waiting, Resolve, Close
  - WAITING: Resume (→IN_PROGRESS), Resolve, Close
  - RESOLVED: Reopen (→OPEN), Close
  - CLOSED: Reopen (→OPEN)

**Create** (modal or page — "New Ticket"):
- Fields: subject*, customerName*, customerEmail*, description*, priority (dropdown, default MEDIUM), category (dropdown), assignedToId (User dropdown), tags (multi-select)

**Delete:** ConfirmDialog

#### Knowledge Base (`/kb`)

**List view:**
- Grouped by category, with article count per category
- Table within each category: title, status (badge), view count, helpful %, updated date
- Search by title or content
- Filter by status (tabs: All, Draft, Published)

**Detail/Edit** (`/kb/[id]` or modal):
- Title, slug (auto-generated from title, editable), content (textarea), category dropdown, status toggle
- Preview of how the article will look

**Create** (modal):
- Fields: title*, content*, categoryId, status (default DRAFT)
- Auto-generate slug from title

**Delete:** ConfirmDialog

**KB Categories** (managed from KB page or Settings):
- List with name, description, article count, drag/sort order
- Create/Edit modal: name*, description, order

#### Tags (managed from Settings or ticket detail)

Tags are created inline when tagging a ticket (type a new tag name to create it). Existing tags can be edited or deleted from Settings.

- **Settings → Tags**: list of all tags with name, color dot, usage count. Create/edit (modal): name*, color. Delete: ConfirmDialog — removes tag from all tickets.

#### Canned Replies (`/canned`)

**List view:**
- Table: title, content preview, category
- Search by title or content

**Create/Edit** (modal):
- Fields: title*, content* (textarea), category

**Delete:** ConfirmDialog

#### Reports (`/reports`)

**Ticket volume:**
- Tickets created per week/month for last 3 months
- Breakdown by priority and category

**Resolution metrics:**
- Average time to first response
- Average time to resolution
- Tickets resolved per team member

**CSAT summary:**
- Average rating over time
- Rating distribution (1-5 stars)
- Recent feedback comments

**Agent workload:**
- Open tickets per team member
- Resolved tickets per team member this month

All reports are read-only views.

#### Settings (`/settings`)

- Default ticket priority
- Auto-close resolved tickets after N days
- CSAT survey enabled/disabled
- Company support email display

## 6. Status Workflows

#### Ticket Status
```
OPEN (info/blue) → IN_PROGRESS (warning/amber) → RESOLVED (success/green) → CLOSED (default/gray)
OPEN → CLOSED
IN_PROGRESS → WAITING (default/gray) → IN_PROGRESS
IN_PROGRESS → RESOLVED
WAITING → RESOLVED
RESOLVED → OPEN (reopen)
CLOSED → OPEN (reopen)
```
- RESOLVED sets resolvedAt timestamp
- CLOSED sets closedAt timestamp
- Reopening clears resolvedAt and closedAt

#### Ticket Priority (display only)
```
LOW (default/gray)
MEDIUM (info/blue)
HIGH (warning/amber)
URGENT (danger/red)
```

#### KB Article Status
```
DRAFT (default/gray) ↔ PUBLISHED (success/green)
```

## 7. Seed Data

**Business:** "CloudSync Solutions" — B2B SaaS company providing file sync and collaboration tools

- **6 Tags:** Bug, Feature Request, Billing, Onboarding, Integration, Urgent (with distinct colors)
- **10 Tickets:**
  - 3 OPEN (1 unassigned, 2 assigned to different team members)
  - 2 IN_PROGRESS (assigned, with comments)
  - 1 WAITING (waiting on customer response)
  - 2 RESOLVED (with CSAT ratings — one 5-star, one 3-star)
  - 2 CLOSED
  - Mix of priorities: 1 URGENT, 2 HIGH, 4 MEDIUM, 3 LOW
  - Mix of categories: TECHNICAL, BILLING, FEATURE_REQUEST, BUG, GENERAL
  - Subjects like: "Can't sync files larger than 2GB", "Billing discrepancy on last invoice", "Request: Calendar integration", "Login issues after password reset"
- **15 TicketComments:** spread across tickets
  - 3 internal notes (staff-only)
  - Rest are replies with realistic troubleshooting/response content
- **3 KB Categories:** Getting Started, Troubleshooting, Account & Billing (with order 1,2,3)
- **6 KB Articles:**
  - 4 PUBLISHED, 2 DRAFT
  - Titles: "How to set up file sync", "Fixing common sync errors", "Managing team permissions", "Understanding your bill", etc.
  - Varied view counts (12 – 347) and helpful counts
- **4 Canned Responses:** "Greeting", "Request More Info", "Escalation Notice", "Resolution Confirmation"

## 8. AI Query Handlers

```
Handlers:
  - list_tickets: Recent tickets with subject, customerName, status, priority, assignedTo
  - open_tickets: Tickets with status OPEN or IN_PROGRESS — subject, priority, assignedTo
  - unassigned_tickets: Tickets with no assignedToId
  - ticket_search: Search tickets by subject or customer — accepts query parameter
  - csat_summary: Average CSAT rating and count of rated tickets
  - list_kb_articles: Published KB articles with title, category, viewCount
```
