# GO4IT Module Builder

You are adding a module to a working org platform. Auth, UI shell, CRUD engine, API routes, and seed data are all pre-built. You write 2 things: a module config and Prisma models.

## Progress Markers

Output these at the appropriate stages:
- `[GO4IT:STAGE:designing]` — First. Plan the data model.
- `[GO4IT:STAGE:coding]` — Writing module config and Prisma schema.
- `[GO4IT:STAGE:complete]` — Done.

## Step 1: Design the Data Model

Output `[GO4IT:STAGE:designing]`

Decide what entities (tables) the module needs and what fields each entity has. Keep it focused — 2-4 entities max.

## Step 2: Add Prisma Models

Output `[GO4IT:STAGE:coding]`

Edit `prisma/schema.prisma` — add your models below the marker line `// === Add app-specific models below this line ===`.

**Rules:**
- Every model needs `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Add `userId String` + `user User @relation(fields: [userId], references: [id])` for user-owned records
- Add a `User` relation field for each model (e.g. `contacts Contact[]`) inside the existing User model
- Use `String` for text, `Int` or `Float` for numbers, `Boolean` for booleans, `DateTime` for dates

**Example:**
```prisma
model Contact {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  company   String?
  status    String   @default("Lead")
  notes     String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  deals     Deal[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Step 3: Create Module Config

Create `src/modules/{moduleId}.ts` — this defines the UI for your module.

**Type reference:**
```ts
import type { ModuleConfig } from "@/types/modules";

const config: ModuleConfig = {
  id: string,           // URL-safe ID: "crm", "invoicing"
  name: string,         // Display name: "Customer CRM"
  description: string,  // Short description
  icon: string,         // Emoji: "👥", "📊"
  entities: [{
    name: string,       // Singular: "Contact"
    slug: string,       // URL slug: "contacts"
    prismaModel: string, // Must match Prisma model name exactly: "Contact"
    icon?: string,      // Emoji for nav
    fields: [{
      name: string,     // DB column name: "email"
      type: "text" | "email" | "phone" | "url" | "number" | "currency" | "date" | "datetime" | "select" | "textarea" | "boolean" | "relation",
      label: string,    // Display label: "Email Address"
      required?: boolean,
      showInTable?: boolean,  // Show in list view table
      options?: string[],     // For "select" type only
      relation?: {            // For "relation" type only
        entity: string,       // Related entity slug
        displayField: string, // Field to display: "name"
      },
      placeholder?: string,
    }],
    defaultSort?: { field: string, direction: "asc" | "desc" },
  }],
};
export default config;
```

**Field type mapping:**
| Field type | Renders as | Prisma type |
|---|---|---|
| text | Text input | String |
| email | Email input | String |
| phone | Tel input | String |
| url | URL input | String |
| number | Number input | Int or Float |
| currency | Number input (step 0.01) | Float |
| date | Date picker | DateTime |
| select | Dropdown | String |
| textarea | Textarea | String |
| boolean | Checkbox | Boolean |
| relation | Dropdown of related records | String (FK) |

**For relation fields:** the `name` must end in `Id` (e.g. `contactId`). The CRUD engine strips `Id` to find the Prisma relation name (e.g. `contact`).

**Complete example (CRM module):**
```ts
import type { ModuleConfig } from "@/types/modules";

const crm: ModuleConfig = {
  id: "crm",
  name: "Customer CRM",
  description: "Manage contacts and deals",
  icon: "👥",
  entities: [
    {
      name: "Contact",
      slug: "contacts",
      prismaModel: "Contact",
      icon: "👤",
      fields: [
        { name: "name", type: "text", label: "Full Name", required: true, showInTable: true },
        { name: "email", type: "email", label: "Email", showInTable: true },
        { name: "phone", type: "phone", label: "Phone" },
        { name: "company", type: "text", label: "Company", showInTable: true },
        { name: "status", type: "select", label: "Status", options: ["Lead", "Active", "Inactive"], showInTable: true },
        { name: "notes", type: "textarea", label: "Notes" },
      ],
      defaultSort: { field: "name", direction: "asc" },
    },
    {
      name: "Deal",
      slug: "deals",
      prismaModel: "Deal",
      icon: "💰",
      fields: [
        { name: "title", type: "text", label: "Deal Title", required: true, showInTable: true },
        { name: "value", type: "currency", label: "Value ($)", showInTable: true },
        { name: "stage", type: "select", label: "Stage", options: ["Prospect", "Qualified", "Proposal", "Closed Won", "Closed Lost"], showInTable: true },
        { name: "contactId", type: "relation", label: "Contact", relation: { entity: "contacts", displayField: "name" }, showInTable: true },
        { name: "closeDate", type: "date", label: "Close Date" },
        { name: "notes", type: "textarea", label: "Notes" },
      ],
      defaultSort: { field: "createdAt", direction: "desc" },
    },
  ],
};

export default crm;
```

## Step 4: Register the Module

Edit `src/modules/index.ts` — import your module config and add it to the array:

```ts
import type { ModuleConfig } from "@/types/modules";
import myModule from "./myModule";

export const modules: ModuleConfig[] = [myModule];
```

## Step 5: Update Package Metadata

Edit `package.json` — update `name` and `description` to match the app.
Edit `src/app/layout.tsx` — update the `metadata` title and description.

Output `[GO4IT:STAGE:complete]`

## Business Context

The user's prompt may begin with a `[BUSINESS CONTEXT]` block. If present:
- Use industry-appropriate terminology for entity names and field labels
- Use relevant `options` arrays for select fields (e.g. a law firm's case "Status" should be "Open", "Discovery", "Litigation", "Settled", "Closed" — not generic "Active"/"Inactive")
- Seed data is auto-generated from the module config — you do NOT write prisma/seed.ts

## Rules

1. Only create/edit the files listed above — the platform handles everything else
2. Do NOT create pages, components, API routes, CSS, or seed files — they are pre-built
3. Do NOT modify: auth.ts, auth.config.ts, prisma.ts, middleware.ts, Shell.tsx, Sidebar.tsx, DataTable.tsx, EntityForm.tsx, StatCard.tsx, globals.css, auth/page.tsx, seed.ts, or any file under api/
4. Prisma model names must exactly match `prismaModel` in the module config
5. Relation field `name` must end in `Id` (e.g. `contactId`, `projectId`)
6. Every entity needs `userId` field + User relation for ownership tracking
7. Mark 3-5 fields per entity with `showInTable: true` for the list view
8. Use `@default(cuid())` for all IDs, `@default(now())` for createdAt
