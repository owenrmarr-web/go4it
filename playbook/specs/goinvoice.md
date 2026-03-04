# GoInvoice — App Spec

## 1. Identity

```
App Name: GoInvoice
Emoji: 💰
Category: Invoicing / Finance
Tagline: Invoicing, estimates, payments, and expense tracking for small businesses
Tags: invoicing, payments, expenses, estimates, finance, accounting, small-business
```

## 2. Domain Boundaries

```
OWNS: Invoices, estimates, payments, expenses, clients, AR/AP tracking, financial reports
DOES NOT OWN: Inventory stock levels (GoInventory), employee pay/timekeeping (GoHR), deal tracking (GoCRM), project tasks (GoProject)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Client

Billing contact — may be a company or individual. Separate from GoCRM contacts.

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, company or individual name |
| email | String? | For sending invoices |
| phone | String? | |
| address | String? | |
| city | String? | |
| state | String? | |
| zip | String? | |
| notes | String? | |

Relations: Invoice (one-to-many), Estimate (one-to-many)

#### Invoice

| Field | Type | Notes |
|-------|------|-------|
| invoiceNumber | String | Required, auto-generated (INV-001, INV-002...) |
| clientId | String | FK → Client |
| status | String | @default("DRAFT"), values: DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| issueDate | DateTime | @default(now()) |
| dueDate | DateTime | Required |
| paidDate | DateTime? | |
| subtotal | Float | @default(0), sum of line items |
| taxRate | Float | @default(0), percentage |
| taxAmount | Float | @default(0), computed |
| total | Float | @default(0), subtotal + taxAmount |
| amountPaid | Float | @default(0), sum of payments received |
| notes | String? | Displayed on invoice |
| terms | String? | Payment terms text |
| estimateId | String? | FK → Estimate, if converted from estimate |

Relations: Client (many-to-one), InvoiceItem (one-to-many), Payment (one-to-many), Estimate (many-to-one, optional)

#### InvoiceItem

| Field | Type | Notes |
|-------|------|-------|
| description | String | Required |
| quantity | Float | @default(1) |
| unitPrice | Float | Required |
| amount | Float | Required, quantity * unitPrice |
| invoiceId | String | FK → Invoice, onDelete: Cascade |

Relations: Invoice (many-to-one)

#### Estimate

| Field | Type | Notes |
|-------|------|-------|
| estimateNumber | String | Required, auto-generated (EST-001, EST-002...) |
| clientId | String | FK → Client |
| status | String | @default("DRAFT"), values: DRAFT, SENT, ACCEPTED, DECLINED, EXPIRED |
| issueDate | DateTime | @default(now()) |
| expiresAt | DateTime? | |
| subtotal | Float | @default(0) |
| taxRate | Float | @default(0) |
| taxAmount | Float | @default(0) |
| total | Float | @default(0) |
| notes | String? | |

Relations: Client (many-to-one), EstimateItem (one-to-many), Invoice (one-to-many, converted invoices)

#### EstimateItem

| Field | Type | Notes |
|-------|------|-------|
| description | String | Required |
| quantity | Float | @default(1) |
| unitPrice | Float | Required |
| amount | Float | Required |
| estimateId | String | FK → Estimate, onDelete: Cascade |

Relations: Estimate (many-to-one)

#### Payment

| Field | Type | Notes |
|-------|------|-------|
| amount | Float | Required |
| paymentDate | DateTime | @default(now()) |
| method | String | @default("OTHER"), values: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER |
| reference | String? | Check number, transaction ID, etc. |
| notes | String? | |
| invoiceId | String | FK → Invoice |

Relations: Invoice (many-to-one)

#### Expense

| Field | Type | Notes |
|-------|------|-------|
| description | String | Required |
| amount | Float | Required |
| date | DateTime | @default(now()) |
| category | String | @default("GENERAL"), values: GENERAL, TRAVEL, MEALS, SUPPLIES, SOFTWARE, UTILITIES, RENT, MARKETING, INSURANCE, OTHER |
| vendor | String? | Who was paid |
| reference | String? | Receipt number, etc. |
| notes | String? | |
| isReimbursable | Boolean | @default(false) |
| isReimbursed | Boolean | @default(false) |

Relations: none (standalone)

#### User relation fields to add

```
clients        Client[]
invoices       Invoice[]
invoiceItems   InvoiceItem[]
estimates      Estimate[]
estimateItems  EstimateItem[]
payments       Payment[]
expenses       Expense[]
```

## 4. Navigation

```
navItems:
  - Dashboard    /              HomeIcon
  - Invoices     /invoices      ReceiptIcon
  - Estimates    /estimates     DocumentIcon
  - Clients      /clients       UsersIcon
  - Payments     /payments      CurrencyIcon
  - Expenses     /expenses      TagIcon
  - Reports      /reports       ChartBarIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Total Outstanding (unpaid invoice totals), Revenue This Month (payments received), Overdue Invoices (count), Expenses This Month
- **Recent invoices**: Last 5 invoices with client name, amount, status badge, due date
- **Upcoming due dates**: Invoices due within next 7 days
- **Revenue vs Expenses chart**: Simple bar or summary showing income vs expenses for current month

#### Invoices (`/invoices`)

**List view:**
- Table columns: invoice number, client name, status (badge), issue date, due date, total, amount paid, balance due
- Filter by status (tabs: All, Draft, Sent, Paid, Overdue, Cancelled)
- Search by invoice number or client name
- Sort by issue date, due date, total
- Highlight overdue invoices (past due date and not paid)

**Detail view** (`/invoices/[id]`):
- Invoice header: number, status badge, client info
- Line items table with quantities, prices, amounts
- Subtotal, tax, total display
- Payment history for this invoice
- Actions based on status:
  - DRAFT: Edit, Send (→SENT), Delete
  - SENT: Record Payment, Mark as Cancelled
  - OVERDUE: Record Payment, Mark as Cancelled
  - PAID: View only

**Create/Edit** (full page or large modal):
- Select client (dropdown with search)
- Add line items: description, quantity, unit price (amount auto-computed)
- Tax rate input (percentage)
- Due date, notes, terms
- Auto-generate invoice number
- Live total calculation

**Delete:** Only when DRAFT — ConfirmDialog

#### Estimates (`/estimates`)

**List view:**
- Table columns: estimate number, client name, status (badge), issue date, expires at, total
- Filter by status (tabs: All, Draft, Sent, Accepted, Declined)
- Search by estimate number or client name

**Detail view** (`/estimates/[id]`):
- Estimate header with status badge and client info
- Line items table
- Actions: Send (→SENT), Convert to Invoice (creates invoice from estimate line items, links via estimateId), Mark Declined

**Create/Edit** (modal or page):
- Same line item pattern as invoices
- Client dropdown, expiration date, notes

**Convert to Invoice:** Creates new invoice with same line items and client, sets estimateId. Status changes to ACCEPTED.

#### Clients (`/clients`)

**List view:**
- Table columns: name, email, phone, invoice count, total billed, total paid, outstanding balance
- Search by name or email

**Detail view** (`/clients/[id]`):
- Client info card with edit button
- Invoice history for this client
- Estimate history for this client
- Total billed, total paid, outstanding balance summary

**Create/Edit** (modal):
- Fields: name*, email, phone, address, city, state, zip, notes

**Delete:** ConfirmDialog — warn if client has invoices

#### Payments (`/payments`)

**List view:**
- Table columns: date, invoice number, client name, amount, method (badge), reference
- Filter by method (dropdown)
- Date range filter
- Sort by date (newest first)

**Create** (modal — "Record Payment"):
- Select invoice (dropdown — only unpaid/partially paid invoices)
- Fields: amount* (default to remaining balance), paymentDate, method (dropdown), reference, notes
- On save: update Invoice.amountPaid, auto-set Invoice status to PAID if fully paid

No edit or delete for payments — they serve as a financial audit trail. This is an intentional exception to full CRUD.

#### Expenses (`/expenses`)

**List view:**
- Table columns: date, description, category (badge), vendor, amount, reimbursable indicator
- Filter by category (dropdown)
- Date range filter
- Search by description or vendor
- Sort by date (newest first)
- Total expenses displayed at bottom

**Create/Edit** (modal):
- Fields: description*, amount*, date, category (dropdown), vendor, reference, notes, isReimbursable (checkbox)

**Delete:** ConfirmDialog

#### Reports (`/reports`)

**Revenue summary:**
- Monthly revenue (sum of payments) for last 12 months
- Total invoiced vs total collected

**Expense summary:**
- Monthly expenses by category for last 12 months
- Top expense categories

**Profit & Loss:**
- Revenue minus expenses, monthly breakdown

**Outstanding AR:**
- Aging report: current (not due), 1-30 days, 31-60 days, 60+ days overdue
- List of all unpaid invoices grouped by aging bucket

**Client summary:**
- Revenue per client, sorted by total billed

All reports are read-only views — no CRUD needed.

#### Settings (`/settings`)

- Default tax rate
- Default payment terms text
- Company name (displayed on invoices)
- Invoice number prefix (default "INV-")
- Estimate number prefix (default "EST-")

## 6. Status Workflows

#### Invoice Status
```
DRAFT (default/gray) → SENT (info/blue) → PAID (success/green)
SENT → OVERDUE (danger/red) → PAID (auto-transition when past dueDate and not paid)
SENT → CANCELLED (default/gray)
OVERDUE → CANCELLED
OVERDUE → PAID
```
- OVERDUE is set automatically when current date > dueDate and status is SENT
- PAID is set when amountPaid >= total

#### Estimate Status
```
DRAFT (default/gray) → SENT (info/blue) → ACCEPTED (success/green)
SENT → DECLINED (danger/red)
SENT → EXPIRED (warning/amber) (auto when past expiresAt)
```
- ACCEPTED is set when converted to invoice

#### Payment Method (display only)
```
CASH (default/gray)
CHECK (default/gray)
BANK_TRANSFER (info/blue)
CREDIT_CARD (info/blue)
OTHER (default/gray)
```

#### Expense Category (display only)
```
GENERAL (default/gray)
TRAVEL (info/blue)
MEALS (warning/amber)
SUPPLIES (default/gray)
SOFTWARE (info/blue)
UTILITIES (default/gray)
RENT (default/gray)
MARKETING (success/green)
INSURANCE (default/gray)
OTHER (default/gray)
```

## 7. Seed Data

**Business:** "Pinnacle Design Studio" — boutique graphic design and branding agency

- **6 Clients:** mix of companies and individuals (Riverside Brewery, Oakwood Dental, Sarah Mitchell Photography, Metro Fitness, Greenleaf Organics, TechStart Inc.)
- **8 Invoices:**
  - 2 DRAFT (not yet sent)
  - 2 SENT (awaiting payment)
  - 2 PAID (with payment records)
  - 1 OVERDUE (past due date, no payment)
  - 1 CANCELLED
  - Each with 2-4 line items (logo design, brand guidelines, website mockups, social media assets, etc.)
  - Varied amounts ($500 – $8,500)
- **4 Estimates:**
  - 1 DRAFT
  - 1 SENT (pending response)
  - 1 ACCEPTED (with linked invoice)
  - 1 DECLINED
- **6 Payments:** linked to PAID invoices, mix of methods (CHECK, BANK_TRANSFER, CREDIT_CARD)
- **10 Expenses:** over last 60 days
  - Mix of categories: SOFTWARE (Adobe subscription), SUPPLIES (printer ink), MEALS (client lunch), TRAVEL (conference), UTILITIES, etc.
  - 2 marked reimbursable, 1 reimbursed
  - Amounts ranging $12 – $450

## 8. AI Query Handlers

```
Handlers:
  - list_invoices: Recent invoices with client name, status, total, dueDate
  - list_estimates: Recent estimates with client name, status, total, expiresAt
  - overdue_invoices: Invoices past due — client name, amount, days overdue
  - outstanding_balance: Total unpaid across all invoices
  - recent_payments: Payments from last 30 days with invoice number, client, amount, method
  - monthly_revenue: Total payments received in current month
  - list_expenses: Recent expenses with description, category, amount, date
  - list_clients: All clients with name, email, total billed
```
