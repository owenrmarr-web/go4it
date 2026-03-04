# Go Suite App Spec Format

Every Go Suite app spec follows the structure below. Place completed specs in `playbook/specs/{appname}.md`.

The spec is fed to Claude Code CLI alongside `playbook/CLAUDE.md` (the system prompt). The playbook handles **how** to build (styling, components, CRUD patterns, protected files). The spec handles **what** to build (domain model, features, boundaries).

---

## Template

````markdown
# {AppName} — App Spec

## 1. Identity

```
App Name: {AppName}
Emoji: {single emoji}
Category: {category from 12-app lineup}
Tagline: {one-sentence description, generic — no company names}
Tags: {comma-separated lowercase tags for marketplace search}
```

## 2. Domain Boundaries

```
OWNS: {what this app is responsible for — its core entities and workflows}
DOES NOT OWN: {what belongs to other Go Suite apps — reference the app name in parens}
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### {ModelName}

{Optional prose description if the model has special behavior (e.g., one-to-one with User, immutable audit log).}

| Field | Type | Notes |
|-------|------|-------|
| {field} | {Prisma type} | {constraints, default, values for enums, FK references} |

Relations: {list related models and cardinality}

{Repeat for each model.}

#### User relation fields to add

```
{fieldName}  {ModelName}[]
{fieldName}  {ModelName}?   // if one-to-one
{fieldName}  {ModelName}[]  @relation("NamedRelation")  // if multiple relations to User
```

## 4. Navigation

```
navItems:
  - {Label}    {href}    {IconName from Icons.tsx}
```

## 5. Features

#### {Page Name} (`{route}`)

{Describe the page in detail:}
- **List view:** columns, search, filters (dropdowns/tabs), sort options
- **Detail view** (`{route}/[id]`): what info to show, related data sections
- **Create/Edit** (modal or page): fields with * for required, dropdowns, defaults
- **Delete:** ConfirmDialog, cascade behavior or warnings

{For dashboards, describe summary cards, tables, and widgets.}

{Note any intentional exceptions to standard CRUD (e.g., immutable audit logs).}

## 6. Status Workflows

#### {Entity} Status
```
{STATUS_A} ({badge variant}/{color}) → {STATUS_B} ({badge variant}/{color})
{STATUS_A} → {STATUS_C}
```
{Notes on transition rules — what triggers each transition, which are final.}

## 7. Seed Data

**Business:** "{Fictional business name}" — {one-line description}

- **{N} {Entity}:** {distribution of statuses, realistic field values, notable scenarios}
- {Repeat for each entity.}
- {Call out specific scenarios: items that demo empty states, alerts, edge cases.}

## 8. AI Query Handlers

```
Handlers:
  - {handler_name}: {what it returns — include key fields}
```
````

---

## Writing Guidelines

1. **Be specific about field values.** List all enum values (e.g., `values: DRAFT, SUBMITTED, RECEIVED`). Specify defaults. This removes ambiguity for the generator.

2. **Describe UI behavior, not implementation.** Say "filter by status (tabs: All, Pending, Approved)" not "use useState with a statusFilter variable." The playbook handles implementation patterns.

3. **Call out exceptions explicitly.** If an entity intentionally lacks delete (e.g., audit logs), say so and explain why. The playbook requires full CRUD by default.

4. **Seed data should demo features.** Include records that trigger alerts (low stock, pending approvals), show empty states (no records in one category), and exercise status workflows (at least one record per status).

5. **Domain boundaries prevent feature overlap.** Every spec must state what it DOES NOT own. This keeps apps focused and avoids duplicate functionality across the suite.

6. **Use the User table for team members.** Per playbook rules, never create separate Employee/Staff/TeamMember models. Build relationships pointing to User. The `isAssigned` flag distinguishes active members.

7. **AI query handlers follow `verb_model` naming.** Every main entity gets at least a `list_` handler. Add filtered handlers for common questions (e.g., `overdue_invoices`, `pending_timeoff`).

8. **Navigation uses icons from `src/components/Icons.tsx`.** Available icons: HomeIcon, UsersIcon, CalendarIcon, ChartBarIcon, CogIcon, EnvelopeIcon, BriefcaseIcon, DocumentIcon, CurrencyIcon, TagIcon, ChatBubbleIcon, BuildingIcon, ClockIcon, BellIcon, CheckCircleIcon, FolderIcon, ListIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ReceiptIcon, TargetIcon, MapPinIcon, LayersIcon, PhoneIcon, InboxIcon.

---

## 12-App Lineup & Feature Boundaries

| # | App | Category | Icon | Owns | Does NOT Own |
|---|-----|----------|------|------|-------------|
| 1 | GoCRM | CRM / Sales | 🤝 | Contacts, companies, deals, sales pipeline, activity log | Scheduling, invoicing, project tasks |
| 2 | GoProject | Project Management | 📋 | Projects, tasks, milestones, assignments, workload | CRM deals, timekeeping/hours, messaging |
| 3 | GoSchedule | Scheduling / Bookings | 📅 | Appointments, provider availability, customer booking page | Employee time-off, project deadlines |
| 4 | GoInventory | Inventory / Supply Chain | 📦 | Products, categories, stock levels, suppliers, purchase orders, stock movements | Customer invoicing, expense tracking |
| 5 | GoInvoice | Invoicing / Finance | 💰 | Invoices, estimates, payments, expenses, AR/AP, financial reports | Inventory stock, employee pay, deal tracking |
| 6 | GoSupport | Support / Helpdesk | 🎧 | Tickets, knowledge base articles, SLAs, CSAT | Internal messaging, internal wiki |
| 7 | GoHR | People / HR | 👥 | Employee profiles, departments, time-off, onboarding, documents, timekeeping, pay tracking, announcements | Payroll processing, customer contacts, internal chat |
| 8 | GoChat | Internal Chat | 💬 | Channels, DMs, threads, file sharing, AI coworker | Email campaigns, support tickets |
| 9 | GoMailer | Marketing / Email | 📧 | Email campaigns, newsletters, contact lists, templates, send history | Customer contacts/deals, internal messaging |
| 10 | GoDocs | Documents | 📄 | Contracts, proposals, document storage, folders, version tracking | Internal SOPs/wiki, employee HR docs |
| 11 | GoForms | Forms / Surveys | 📝 | Form builder, surveys, checklists, submission tracking, response analytics | Support tickets, employee onboarding forms |
| 12 | GoWiki | Knowledge Base | 📚 | Internal SOPs, training docs, team wiki, categories, search | Customer-facing KB, contracts/proposals |
