# Go Suite App Spec Template

Every Go Suite app is generated from a spec file following this format. The spec is placed as `SPEC.md` in the workspace alongside `playbook/CLAUDE.md` (the system prompt).

The playbook handles **how** to build (styling, components, CRUD patterns, protected files). The spec handles **what** to build (domain model, features, boundaries).

---

## Required Sections

### 1. Identity

```
App Name: GoExample
Emoji: 📦
Category: Inventory / Supply Chain
Tagline: Product inventory tracking with stock levels, suppliers, and purchase orders
Tags: inventory, products, stock, suppliers, purchase-orders, small-business
```

Used to populate `go4it.json`, `package.json`, favicon, and `AppShell` config.

### 2. Domain Boundaries

What this app owns and explicitly does NOT own. Prevents feature creep and overlap with other Go Suite apps.

```
OWNS: Products, categories, stock levels, suppliers, purchase orders, stock movements
DOES NOT OWN: Customer invoicing (GoInvoice), expense tracking (GoInvoice), deal tracking (GoCRM)
```

### 3. Entities

Prisma models with field tables. Every model must follow playbook schema rules (id, createdAt, updatedAt, userId + User relation).

Format per entity:

```
#### ModelName

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| status | String | @default("ACTIVE"), values: ACTIVE, INACTIVE |
| categoryId | String? | FK → Category |
| ... | ... | ... |

Relations: Category (many-to-one), StockMovement (one-to-many)
```

### 4. Navigation

Exact nav items array for `src/app/(app)/layout.tsx`:

```
navItems:
  - Dashboard    /           HomeIcon
  - Products     /products   LayersIcon
  - Categories   /categories TagIcon
  - Suppliers    /suppliers  BuildingIcon
  - Orders       /orders     ReceiptIcon
  - Movements    /movements  ListIcon
  - Settings     /settings   CogIcon
```

Must use icons from the template's `Icons.tsx` (see playbook for available icons).

### 5. Features

Ordered list of pages/views with exact behavior. Each feature maps to a nav item and route.

Format per feature:

```
#### Dashboard (`/`)

- Summary cards: total products, low stock alerts, pending orders, total suppliers
- Recent activity: last 10 stock movements
- Low stock table: products where quantity < reorderPoint
```

```
#### Products (`/products`)

List view:
- Table with columns: name, SKU, category, quantity, reorder point, unit price, status
- Search by name or SKU
- Filter by category (dropdown) and status (tabs: All, Active, Inactive)
- Sort by name, quantity, price, updated date

Detail view (`/products/[id]`):
- Product info card with edit button
- Stock movement history table
- Purchase order history

Create/Edit (modal):
- Fields: name*, SKU*, categoryId, description, unitPrice*, quantity, reorderPoint, status
- * = required

Delete: ConfirmDialog
```

### 6. Status Workflows

State machines with badge colors for entities that have status fields.

```
#### Product Status
ACTIVE (success/green) → INACTIVE (default/gray)
INACTIVE → ACTIVE

#### Purchase Order Status
DRAFT (default/gray) → SUBMITTED (info/blue) → RECEIVED (success/green)
DRAFT → CANCELLED (danger/red)
SUBMITTED → CANCELLED
```

Map badge variants: success = green, warning = amber, info = blue, danger = red, default = gray.

### 7. Seed Data

Fictional business scenario with exact record counts. All records owned by admin user (userId = "preview").

```
Business: "Summit Outdoor Supply" — outdoor recreation equipment retailer

- 5 Categories: Camping, Climbing, Cycling, Water Sports, Winter Sports
- 12 Products: mix of statuses, some below reorder point
- 4 Suppliers: with different specialties
- 8 Stock Movements: mix of types (received, sold, adjusted, returned)
- 3 Purchase Orders: one DRAFT, one SUBMITTED, one RECEIVED with line items
```

### 8. AI Query Handlers

Cross-app data endpoints for `/api/ai-query`. Each handler name follows the `verb_model` convention.

```
Handlers:
  - list_products: Recent products with category, quantity, status
  - low_stock: Products where quantity < reorderPoint
  - list_suppliers: All suppliers with contact info
  - recent_orders: Purchase orders from last 30 days with status
```

---

## Notes

- Do NOT include auth models (User, Account, Session, etc.) — they're in the template already. Only list fields you're adding to User (relation arrays).
- Do NOT specify styling details — the playbook's design system handles that.
- Do NOT specify component implementations — the playbook's pre-built components handle that.
- DO specify exact field names, types, and enum values — these remove ambiguity.
- DO specify exact nav items and their icons — this ensures consistency across apps.
- DO specify exact seed data counts and scenario — this ensures demo quality.
