# GoWiki — App Spec

## 1. Identity

```
App Name: GoWiki
Emoji: 📚
Category: Knowledge Base
Tagline: Internal wiki, SOPs, and training documentation for small teams
Tags: wiki, knowledge-base, documentation, sops, training, team-wiki, small-business
```

## 2. Domain Boundaries

```
OWNS: Internal SOPs, training documents, team wiki pages, categories, search, page history
DOES NOT OWN: Customer-facing knowledge base (GoSupport), contracts/proposals (GoDocs), employee HR documents (GoHR)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Space

Top-level grouping for wiki pages (like a wiki namespace or section).

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| description | String? | |
| icon | String | @default("📁"), emoji for display |
| color | String | @default("#6366f1"), for UI badges |
| order | Int | @default(0), sort position |

Relations: Page (one-to-many)

#### Page

A wiki page. Supports hierarchy — pages can have sub-pages via parentId.

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| slug | String | Required, URL-friendly, unique per user |
| content | String | Required, page body (multi-line text, supports markdown-style formatting) |
| status | String | @default("DRAFT"), values: DRAFT, PUBLISHED, ARCHIVED |
| spaceId | String | FK → Space |
| parentId | String? | FK → Page (self-referencing), null = top-level page in space |
| authorId | String? | FK → User, original author |
| lastEditedById | String? | FK → User, last editor |
| viewCount | Int | @default(0) |
| pinned | Boolean | @default(false), pinned pages appear first in space |
| order | Int | @default(0), sort position within parent |

Relations: Space (many-to-one), Page self-reference (parent/children), PageRevision (one-to-many), User via authorId (named relation `@relation("PageAuthor")`), User via lastEditedById (named relation `@relation("PageEditor")`)

#### PageRevision

Immutable edit history. Each save creates a new revision.

| Field | Type | Notes |
|-------|------|-------|
| content | String | Required, snapshot of page content |
| changeNotes | String? | What was changed |
| editorId | String? | FK → User |
| revisionNumber | Int | Required, auto-incremented per page (1, 2, 3...) |
| pageId | String | FK → Page, onDelete: Cascade |

Relations: Page (many-to-one), User via editorId (named relation `@relation("RevisionEditor")`)

No edit or delete for revisions — immutable history. Intentional exception to full CRUD.

#### Tag

Flat tags for cross-cutting categorization (pages can span multiple topics).

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, unique per user |
| color | String | @default("#6366f1") |

Relations: PageTag (one-to-many)

#### PageTag

Join table for Page ↔ Tag many-to-many.

| Field | Type | Notes |
|-------|------|-------|
| pageId | String | FK → Page, onDelete: Cascade |
| tagId | String | FK → Tag, onDelete: Cascade |

Unique constraint: `@@unique([pageId, tagId])`

Relations: Page (many-to-one), Tag (many-to-one)

#### User relation fields to add

```
spaces                 Space[]
pages                  Page[]
pagesByAuthor          Page[]           @relation("PageAuthor")
pagesByEditor          Page[]           @relation("PageEditor")
pageRevisionsOwned     PageRevision[]
pageRevisionsByEditor  PageRevision[]   @relation("RevisionEditor")
tags                   Tag[]
pageTags               PageTag[]
```

## 4. Navigation

```
navItems:
  - Home         /              HomeIcon
  - Spaces       /spaces        FolderIcon
  - All Pages    /pages         DocumentIcon
  - Tags         /tags          TagIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Home (`/`)

- **Quick search**: prominent search bar at top — searches page titles and content
- **Pinned pages**: grid of pinned pages across all spaces with title, space badge, last updated
- **Recently updated**: Last 8 pages updated with title, space, editor UserAvatar, updated timestamp
- **Spaces overview**: card grid of all spaces with icon, name, page count, description

#### Spaces (`/spaces`)

**List view:**
- Card grid: space icon (emoji), name, description, page count, color accent
- Sort by order (manual), name, page count
- Search by name

**Detail view** (`/spaces/[id]`):
- Space header: icon, name, description, page count
- Page tree: hierarchical list of pages in this space
  - Top-level pages shown first, expandable to show sub-pages
  - Each page shows: title, status badge, author UserAvatar, updated date
  - Pinned pages appear at top with pin indicator
- Add page button
- Edit space button

**Create/Edit** (modal):
- Fields: name*, description, icon (emoji picker or text input), color, order

**Delete:** ConfirmDialog — warn if space has pages (must move or delete them first)

#### All Pages (`/pages`)

**List view:**
- Table columns: title, space name, status (badge), tags, author (UserAvatar), last edited by (UserAvatar), updated date, view count
- Filter by status (tabs: All, Draft, Published, Archived)
- Filter by space (dropdown)
- Filter by tag (dropdown)
- Search by title or content
- Sort by updated date, title, view count

**Detail view** (`/pages/[id]`):
- Page header: title, space badge, status badge, tags as colored pills
- Page content rendered as formatted text
- Metadata sidebar: author, created date, last edited by, updated date, view count, revision count
- Sub-pages list (if any child pages exist)
- Revision history: list of all revisions with number, change notes, editor, timestamp — click to view/compare
- Actions based on status:
  - DRAFT: Edit, Publish (→PUBLISHED), Delete
  - PUBLISHED: Edit, Archive (→ARCHIVED), Pin/Unpin
  - ARCHIVED: Restore (→DRAFT), Delete

**Create** (page):
- Fields: title*, spaceId* (dropdown), content* (textarea), parentId (dropdown — pages in selected space), tags (multi-select), status (default DRAFT)
- Auto-generate slug from title
- Creates initial PageRevision (revision 1)

**Edit** (page — same layout as create):
- On save: creates new PageRevision with incremented number and change notes input
- Updates Page.lastEditedById

**Delete:** ConfirmDialog — only when DRAFT or ARCHIVED. Warn if page has sub-pages.

#### Tags (`/tags`)

**List view:**
- Card grid: tag name, color dot, page count
- Search by name

**Tag detail** (inline or filtered page list):
- Shows all pages with this tag — same table as All Pages filtered by tag

**Create/Edit** (modal):
- Fields: name*, color

**Delete:** ConfirmDialog — removes tag from all pages

#### Settings (`/settings`)

- Default page status on create (DRAFT or PUBLISHED)
- Wiki title (displayed in header)
- Auto-archive pages not updated in N days (optional)

## 6. Status Workflows

#### Page Status
```
DRAFT (default/gray) → PUBLISHED (success/green) → ARCHIVED (default/gray)
PUBLISHED → DRAFT (unpublish for major edits)
ARCHIVED → DRAFT (restore)
```
- Only PUBLISHED pages are visible in search results and space listings by default
- DRAFT pages are visible to their author and admins
- ARCHIVED pages are hidden unless explicitly filtered

## 7. Seed Data

**Business:** "Trailhead Adventures" — outdoor adventure company with guides and trip operations

- **4 Spaces:**
  - "Operations Manual" (📋, blue) — SOPs for running trips
  - "Safety Protocols" (🛡️, red) — emergency procedures, equipment checks
  - "Training Resources" (🎓, green) — new guide training materials
  - "Company Info" (🏢, gray) — policies, benefits, general info
- **12 Pages:**
  - Operations Manual (4 pages): "Trip Planning Checklist" (PUBLISHED, pinned), "Vehicle Maintenance Schedule" (PUBLISHED), "Client Communication Guidelines" (PUBLISHED), "Post-Trip Report Template" (DRAFT)
  - Safety Protocols (3 pages): "Emergency Response Procedures" (PUBLISHED, pinned), "Equipment Inspection Guide" (PUBLISHED), "Weather Assessment Protocol" (PUBLISHED)
    - "Equipment Inspection Guide" has 2 sub-pages: "Kayak Checklist", "Climbing Gear Checklist" (both PUBLISHED)
  - Training Resources (3 pages): "New Guide Orientation" (PUBLISHED, pinned), "Wilderness First Aid Overview" (PUBLISHED), "Customer Service Best Practices" (DRAFT)
  - Company Info (2 pages): "PTO Policy" (PUBLISHED), "Expense Reimbursement Process" (ARCHIVED)
  - View counts ranging from 5 to 89
- **15 PageRevisions:** 1-3 per page
  - Change notes: "Initial draft", "Updated safety contact numbers", "Added winter protocols", "Fixed formatting"
- **6 Tags:** Safety, Training, Equipment, Operations, Policy, Seasonal (with distinct colors)
  - PageTags linking tags to relevant pages (e.g., "Emergency Response Procedures" tagged Safety + Operations)
- **Tag distribution:** each tag applied to 2-4 pages

## 8. AI Query Handlers

```
Handlers:
  - list_pages: Published pages with title, spaceName, tags, updatedAt, viewCount
  - recent_pages: Pages updated in last 7 days — title, spaceName, lastEditedBy
  - page_search: Search pages by title or content — accepts query parameter
  - list_spaces: All spaces with name, icon, pageCount
  - popular_pages: Top 10 pages by viewCount — title, spaceName, viewCount
  - tagged_pages: Pages with a specific tag — accepts tag parameter
```
