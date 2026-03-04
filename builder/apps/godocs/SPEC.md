# GoDocs — App Spec

## 1. Identity

```
App Name: GoDocs
Emoji: 📄
Category: Documents
Tagline: Contract, proposal, and document management with folders and version tracking
Tags: documents, contracts, proposals, files, version-tracking, folders, small-business
```

## 2. Domain Boundaries

```
OWNS: Contracts, proposals, document storage/metadata, folders, version tracking, document templates
DOES NOT OWN: Internal SOPs/wiki (GoWiki), employee HR documents (GoHR), knowledge base articles (GoSupport)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Folder

Hierarchical folder structure for organizing documents. Supports one level of nesting (parent/child).

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| description | String? | |
| color | String | @default("#6366f1"), for UI icons/badges |
| parentId | String? | FK → Folder (self-referencing), null = root folder |

Relations: Document (one-to-many), Folder self-reference (parent/children)

#### Document

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| type | String | @default("OTHER"), values: CONTRACT, PROPOSAL, AGREEMENT, INVOICE, REPORT, TEMPLATE, OTHER |
| status | String | @default("DRAFT"), values: DRAFT, IN_REVIEW, APPROVED, SIGNED, EXPIRED, ARCHIVED |
| content | String? | Document body text (for text-based documents) |
| description | String? | Brief summary |
| folderId | String? | FK → Folder, null = unfiled |
| clientName | String? | Associated client or counterparty |
| clientEmail | String? | |
| expiresAt | DateTime? | For contracts/agreements with expiration |
| signedAt | DateTime? | When document was signed |
| signedBy | String? | Name of signer |
| fileSize | Int? | In bytes, for future file upload |
| fileName | String? | Original file name |
| currentVersionId | String? | FK → DocumentVersion, latest version |

Relations: Folder (many-to-one), DocumentVersion (one-to-many), DocumentComment (one-to-many)

#### DocumentVersion

Immutable version history. Each edit creates a new version.

| Field | Type | Notes |
|-------|------|-------|
| versionNumber | Int | Required, auto-incremented per document (1, 2, 3...) |
| content | String | Required, snapshot of document content at this version |
| changeNotes | String? | What changed in this version |
| authorId | String? | FK → User, who made this version |
| documentId | String | FK → Document, onDelete: Cascade |

Relations: Document (many-to-one), User via authorId (many-to-one, named relation `@relation("VersionAuthor")`)

No edit or delete for versions — immutable history. Intentional exception to full CRUD.

#### DocumentComment

Discussion thread on a document (review feedback, questions, approvals).

| Field | Type | Notes |
|-------|------|-------|
| content | String | Required |
| authorId | String? | FK → User |
| documentId | String | FK → Document, onDelete: Cascade |

Relations: Document (many-to-one), User via authorId (many-to-one, named relation `@relation("DocCommentAuthor")`)

#### DocumentTemplate

Reusable starting points for new documents.

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| type | String | @default("OTHER"), values: CONTRACT, PROPOSAL, AGREEMENT, REPORT, OTHER |
| content | String | Required, template body text |
| description | String? | |

Relations: none

#### User relation fields to add

```
folders                    Folder[]
documents                  Document[]
documentVersionsOwned      DocumentVersion[]
documentVersionsByAuthor   DocumentVersion[]   @relation("VersionAuthor")
documentCommentsOwned      DocumentComment[]
documentCommentsByAuthor   DocumentComment[]   @relation("DocCommentAuthor")
documentTemplates          DocumentTemplate[]
```

## 4. Navigation

```
navItems:
  - Dashboard    /              HomeIcon
  - Documents    /documents     DocumentIcon
  - Folders      /folders       FolderIcon
  - Templates    /templates     LayersIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Total Documents, Documents In Review, Expiring Soon (within 30 days), Recently Updated (last 7 days count)
- **Recent documents**: Last 5 documents with title, type badge, status badge, folder name, updated date
- **Expiring documents**: Documents with expiresAt within next 30 days — title, client, expiration date
- **Review queue**: Documents in IN_REVIEW status awaiting approval

#### Documents (`/documents`)

**List view:**
- Table columns: title, type (badge), status (badge), folder name, client name, updated date, version number
- Filter by status (tabs: All, Draft, In Review, Approved, Signed, Expired, Archived)
- Filter by type (dropdown)
- Filter by folder (dropdown)
- Search by title, client name, or description
- Sort by title, updated date, created date

**Detail view** (`/documents/[id]`):
- Document header: title, type badge, status badge, folder, client info
- Document content area (rendered text)
- Metadata sidebar: created date, updated date, version number, file info, expiration, signer
- Version history: list of all versions with version number, change notes, author, timestamp — click to view previous version content
- Comments section: threaded comments with author UserAvatar, timestamp, content — add comment form. Comments can be deleted by their author (ConfirmDialog) but not edited — keeps review trail intact.
- Actions based on status:
  - DRAFT: Edit, Submit for Review (→IN_REVIEW), Delete
  - IN_REVIEW: Edit, Approve (→APPROVED), Return to Draft (→DRAFT)
  - APPROVED: Mark as Signed (→SIGNED, set signedAt/signedBy), Archive (→ARCHIVED)
  - SIGNED: Archive (→ARCHIVED), view only
  - EXPIRED: Renew (→DRAFT, creates new version), Archive
  - ARCHIVED: Restore (→DRAFT)

**Create** (page):
- Fields: title*, type (dropdown), folderId (dropdown), content (textarea), description, clientName, clientEmail, expiresAt
- Option to start from template (dropdown — pre-fills content and type)
- Creates initial DocumentVersion (version 1)

**Edit** (page — same as create but pre-populated):
- On save: creates new DocumentVersion with incremented version number and change notes
- Updates Document.currentVersionId

**Delete:** Only when DRAFT — ConfirmDialog

#### Folders (`/folders`)

**List view:**
- Card grid: folder name, color icon, document count, description, subfolder count
- Root folders shown first, expand to show subfolders
- Search by name

**Detail view** (inline or `/folders/[id]`):
- Shows all documents in this folder (and subfolders)
- Same table format as Documents list view

**Create/Edit** (modal):
- Fields: name*, description, color, parentId (dropdown — only root folders, max 1 level nesting)

**Delete:** ConfirmDialog — warn if folder contains documents (must move or delete them first)

#### Templates (`/templates`)

**List view:**
- Card grid: name, type badge, description preview, last updated
- Search by name
- Filter by type (dropdown)

**Create/Edit** (modal or page):
- Fields: name*, type (dropdown), content* (textarea), description

**Delete:** ConfirmDialog

#### Settings (`/settings`)

- Default document type
- Default expiration period (days from creation)
- Company name (for document headers)
- Auto-archive expired documents toggle

## 6. Status Workflows

#### Document Status
```
DRAFT (default/gray) → IN_REVIEW (warning/amber) → APPROVED (success/green) → SIGNED (info/blue) → ARCHIVED (default/gray)
DRAFT → ARCHIVED
IN_REVIEW → DRAFT (returned for revision)
APPROVED → ARCHIVED
SIGNED → ARCHIVED
EXPIRED (danger/red) → DRAFT (renew)
EXPIRED → ARCHIVED
ARCHIVED → DRAFT (restore)
```
- EXPIRED is auto-set when current date > expiresAt and status is APPROVED or SIGNED
- SIGNED requires signedAt and signedBy to be set

#### Document Type (display only)
```
CONTRACT (info/blue)
PROPOSAL (warning/amber)
AGREEMENT (info/blue)
INVOICE (success/green)
REPORT (default/gray)
TEMPLATE (default/gray)
OTHER (default/gray)
```

## 7. Seed Data

**Business:** "Cascade Legal Consulting" — small legal consulting firm managing client contracts and proposals

- **4 Folders:**
  - "Client Contracts" (root, blue)
  - "Active Proposals" (root, green)
  - "Internal Documents" (root, gray)
  - "2024 Renewals" (child of Client Contracts, amber)
- **10 Documents:**
  - 2 DRAFT (new proposal, internal report)
  - 1 IN_REVIEW (contract pending legal review)
  - 2 APPROVED (awaiting signatures)
  - 2 SIGNED (completed contracts with signedAt/signedBy)
  - 1 EXPIRED (contract past expiration date)
  - 2 ARCHIVED (old completed documents)
  - Mix of types: CONTRACT (4), PROPOSAL (3), AGREEMENT (1), REPORT (2)
  - Client names: "Meridian Properties", "Atlas Ventures", "Harbor Technologies", "Summit Partners"
  - Realistic content: service agreements, consulting proposals, NDA text
- **15 DocumentVersions:** 1-3 versions per document
  - Change notes: "Initial draft", "Updated payment terms", "Legal review edits", "Final approved version"
- **8 DocumentComments:** spread across 4 documents
  - Review feedback: "Section 3 needs updated liability clause", "Approved pending signature", "Client requested 60-day payment terms instead of 30"
- **3 DocumentTemplates:**
  - "Standard Service Agreement" (CONTRACT)
  - "Consulting Proposal" (PROPOSAL)
  - "Non-Disclosure Agreement" (AGREEMENT)

## 8. AI Query Handlers

```
Handlers:
  - list_documents: Recent documents with title, type, status, clientName, updatedAt
  - documents_in_review: Documents with status IN_REVIEW — title, clientName, submittedDate
  - expiring_documents: Documents expiring within 30 days — title, clientName, expiresAt
  - document_search: Search documents by title or clientName — accepts query parameter
  - list_folders: All folders with name, documentCount
  - list_templates: All templates with name, type
```
