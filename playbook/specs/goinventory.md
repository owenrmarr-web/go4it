# GoInventory — App Spec

## 1. Identity

```
App Name: GoInventory
Emoji: 📦
Category: Inventory / Supply Chain
Tagline: Product inventory tracking with stock levels, suppliers, and purchase orders
Tags: inventory, products, stock, suppliers, purchase-orders, small-business
```

## 2. Domain Boundaries

```
OWNS: Products, categories, stock levels, suppliers, purchase orders, stock movements
DOES NOT OWN: Customer invoicing (GoInvoice), expense tracking (GoInvoice), deal tracking (GoCRM), project tasks (GoProject)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Category

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, unique per user |
| description | String? | |
| color | String | @default("#6366f1"), hex color for UI badges |

Relations: Product (one-to-many)

#### Product

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| sku | String | Required, unique per user |
| description | String? | |
| unitPrice | Float | @default(0) |
| costPrice | Float | @default(0) |
| quantity | Int | @default(0), current stock level |
| reorderPoint | Int | @default(0), low stock threshold |
| unit | String | @default("each"), e.g. each, kg, lb, box, case |
| status | String | @default("ACTIVE"), values: ACTIVE, INACTIVE |
| categoryId | String? | FK → Category |
| imageUrl | String? | |

Relations: Category (many-to-one), StockMovement (one-to-many), PurchaseOrderItem (one-to-many)

#### Supplier

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required |
| contactName | String? | |
| email | String? | |
| phone | String? | |
| address | String? | |
| city | String? | |
| state | String? | |
| zip | String? | |
| notes | String? | |

Relations: PurchaseOrder (one-to-many)

#### StockMovement

| Field | Type | Notes |
|-------|------|-------|
| type | String | Required, values: RECEIVED, SOLD, ADJUSTED, RETURNED, DAMAGED |
| quantity | Int | Required, positive = stock in, negative = stock out |
| notes | String? | Reason for adjustment |
| productId | String | FK → Product |
| referenceId | String? | Optional link to PurchaseOrder id |

Relations: Product (many-to-one)

#### PurchaseOrder

| Field | Type | Notes |
|-------|------|-------|
| orderNumber | String | Required, auto-generated (PO-001, PO-002...) |
| status | String | @default("DRAFT"), values: DRAFT, SUBMITTED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED |
| supplierId | String | FK → Supplier |
| orderDate | DateTime | @default(now()) |
| expectedDate | DateTime? | Expected delivery date |
| receivedDate | DateTime? | |
| notes | String? | |
| totalAmount | Float | @default(0), computed from line items |

Relations: Supplier (many-to-one), PurchaseOrderItem (one-to-many)

#### PurchaseOrderItem

| Field | Type | Notes |
|-------|------|-------|
| quantity | Int | Required, ordered quantity |
| receivedQuantity | Int | @default(0) |
| unitPrice | Float | Required, price per unit on this order |
| productId | String | FK → Product |
| purchaseOrderId | String | FK → PurchaseOrder, onDelete: Cascade |

Relations: Product (many-to-one), PurchaseOrder (many-to-one)

#### User relation fields to add

```
products       Product[]
categories     Category[]
suppliers      Supplier[]
stockMovements StockMovement[]
purchaseOrders PurchaseOrder[]
purchaseOrderItems PurchaseOrderItem[]
```

## 4. Navigation

```
navItems:
  - Dashboard    /              HomeIcon
  - Products     /products      LayersIcon
  - Categories   /categories    TagIcon
  - Suppliers    /suppliers     BuildingIcon
  - Orders       /orders        ReceiptIcon
  - Movements    /movements     ListIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Total Products, Low Stock Alerts (quantity < reorderPoint), Pending Orders (DRAFT + SUBMITTED), Total Suppliers
- **Low stock alerts table**: Products where quantity <= reorderPoint, columns: name, SKU, current qty, reorder point, category. Link to product detail.
- **Recent movements**: Last 10 stock movements with type badge, product name, quantity, date
- **Pending orders**: Purchase orders in DRAFT or SUBMITTED status with supplier name, total, expected date

#### Products (`/products`)

**List view:**
- Table columns: name, SKU, category (badge with category color), quantity, reorder point, unit price, status
- Search by name or SKU
- Filter by category (dropdown) and status (tabs: All, Active, Inactive)
- Low stock indicator: highlight row or show warning icon when quantity <= reorderPoint
- Sort by name, quantity, price, updated date

**Detail view** (`/products/[id]`):
- Product info card with all fields, edit button
- Stock level with visual indicator (green if above reorder, amber if at reorder, red if below)
- Stock movement history: table of all movements for this product, newest first
- Purchase order history: orders containing this product

**Create/Edit** (modal):
- Fields: name*, SKU*, categoryId (dropdown), description, unitPrice*, costPrice, quantity (create only — use movements for changes after creation), reorderPoint, unit (dropdown), status (dropdown)
- * = required

**Delete:** ConfirmDialog, cascade-deletes stock movements

#### Categories (`/categories`)

Modal-only CRUD — no detail page. Categories are simple enough that list + modals is sufficient.

**List view:**
- Card grid showing category name, color dot, product count, description
- Search by name

**Create/Edit** (modal):
- Fields: name*, description, color (color picker or preset swatches)

**Delete:** ConfirmDialog — warn if category has products, suggest reassigning first

#### Suppliers (`/suppliers`)

**List view:**
- Table columns: name, contact name, email, phone, order count, last order date
- Search by name or contact name

**Detail view** (`/suppliers/[id]`):
- Supplier info card with all fields, edit button
- Purchase order history for this supplier

**Create/Edit** (modal):
- Fields: name*, contactName, email, phone, address, city, state, zip, notes

**Delete:** ConfirmDialog

#### Orders (`/orders`)

**List view:**
- Table columns: order number, supplier name, status (badge), order date, expected date, total amount, item count
- Filter by status (tabs: All, Draft, Submitted, In Progress, Received, Cancelled)
- Sort by order date, expected date, total

**Detail view** (`/orders/[id]`):
- Order header: order number, status badge, supplier, dates, notes
- Status actions: Submit (DRAFT→SUBMITTED), Receive (SUBMITTED→RECEIVED), Cancel
- Line items table: product name, ordered qty, received qty, unit price, line total
- When receiving: allow entering received quantities per item, auto-create StockMovement records of type RECEIVED, update Product quantities
- Order total computed from line items

**Create** (full page or large modal):
- Select supplier (dropdown)
- Add line items: search/select product, enter quantity and unit price
- Set expected delivery date, notes
- Auto-generate order number (PO-001, etc.)

**Edit:** Only when status is DRAFT — change supplier, items, dates

**Delete:** Only when status is DRAFT — ConfirmDialog

#### Movements (`/movements`)

**List view:**
- Table columns: date, type (badge), product name, quantity (+/-), notes, created by
- Filter by type (tabs: All, Received, Sold, Adjusted, Returned, Damaged)
- Date range filter
- Sort by date (default: newest first)

**Create** (modal — "Record Stock Adjustment"):
- Fields: product* (search/select), type* (dropdown: SOLD, ADJUSTED, RETURNED, DAMAGED — RECEIVED is only via purchase orders), quantity*, notes
- On save: update Product.quantity accordingly

No edit or delete for movements — they are an immutable audit log. This is an intentional exception to the playbook's "full CRUD for every entity" rule. Stock movements serve as an audit trail; corrections are made by creating new adjustment records.

#### Settings (`/settings`)

- Default unit of measure preference
- Low stock alert threshold multiplier
- Company/warehouse name display

## 6. Status Workflows

#### Product Status
```
ACTIVE (success/green) ↔ INACTIVE (default/gray)
```

#### Purchase Order Status
```
DRAFT (default/gray) → SUBMITTED (info/blue) → PARTIALLY_RECEIVED (warning/amber) → RECEIVED (success/green)
DRAFT → CANCELLED (danger/red)
SUBMITTED → CANCELLED
```
- PARTIALLY_RECEIVED: when some but not all items have receivedQuantity == quantity
- RECEIVED: when all items fully received

#### Stock Movement Type (display only, not a workflow)
```
RECEIVED (success/green)
SOLD (info/blue)
ADJUSTED (warning/amber)
RETURNED (default/gray)
DAMAGED (danger/red)
```

## 7. Seed Data

**Business:** "Summit Outdoor Supply" — outdoor recreation equipment retailer

- **5 Categories:** Camping Gear, Climbing Equipment, Cycling, Water Sports, Winter Sports (with distinct colors)
- **12 Products:** mix across categories
  - 3 below reorder point (to demo low stock alerts)
  - 2 INACTIVE
  - Varied prices ($12.99 – $899.99)
  - SKUs like "CAMP-001", "CLIMB-001"
- **4 Suppliers:** Mountain Gear Co., Rapid River Supply, Peak Performance Wholesale, Nordic Trail Distributors
- **15 Stock Movements:** mix of RECEIVED, SOLD, ADJUSTED, RETURNED, DAMAGED across products over last 30 days
- **4 Purchase Orders:**
  - 1 DRAFT with 3 line items
  - 1 SUBMITTED with 4 line items, expected date in future
  - 1 RECEIVED with 3 line items, all received
  - 1 CANCELLED with 2 line items

## 8. AI Query Handlers

```
Handlers:
  - list_products: Recent products with category, quantity, status, unitPrice
  - low_stock: Products where quantity <= reorderPoint — include name, SKU, quantity, reorderPoint
  - list_suppliers: All suppliers with name, email, phone
  - recent_orders: Purchase orders from last 30 days with status, supplier name, total
  - stock_value: Total inventory value (sum of quantity * costPrice for all ACTIVE products)
  - product_search: Search products by name or SKU — accepts query parameter
```
