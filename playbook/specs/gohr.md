# GoHR — App Spec

## 1. Identity

```
App Name: GoHR
Emoji: 👥
Category: People / HR
Tagline: Employee directory, time-off tracking, onboarding, and timekeeping for small businesses
Tags: hr, employees, time-off, onboarding, timekeeping, people, small-business
```

## 2. Domain Boundaries

```
OWNS: Employee profiles (User extensions), departments, time-off requests, onboarding checklists, HR documents, timekeeping (clock in/out, hours), pay stubs/tracking, announcements
DOES NOT OWN: Actual payroll processing (external — export to Gusto/ADP), customer contacts (GoCRM), internal chat (GoChat), project tasks (GoProject)
```

## 3. Entities

NOTE: Per playbook rules, the User table IS the employee roster. Do NOT create a separate Employee model. Instead, extend User with optional HR fields and create related models that reference User.

Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Department

| Field | Type | Notes |
|-------|------|-------|
| name | String | Required, unique per user |
| description | String? | |
| headId | String? | FK → User, department head |
| color | String | @default("#6366f1"), for UI badges |

Relations: EmployeeProfile (one-to-many), User via headId (many-to-one, use named relation `@relation("DepartmentHead")`)

#### EmployeeProfile

Extends User with HR-specific data. **One-to-one** with User (each user has at most one profile). Users without a profile are visible in the system but not part of the HR directory.

| Field | Type | Notes |
|-------|------|-------|
| employeeId | String | Employee number, e.g. "EMP-001" |
| hireDate | DateTime | Required |
| jobTitle | String | Required |
| employmentType | String | @default("FULL_TIME"), values: FULL_TIME, PART_TIME, CONTRACT, INTERN |
| departmentId | String? | FK → Department |
| managerId | String? | FK → User (self-referencing via User) |
| phone | String? | Personal phone |
| emergencyContact | String? | Name and phone |
| address | String? | |
| city | String? | |
| state | String? | |
| zip | String? | |
| hourlyRate | Float? | For timekeeping/pay tracking |
| salary | Float? | Annual salary (display only) |
| status | String | @default("ACTIVE"), values: ACTIVE, ON_LEAVE, TERMINATED |
| terminatedDate | DateTime? | |
| notes | String? | |
| staffUserId | String | @unique, FK → User, the team member this profile belongs to |

Relations: Department (many-to-one), User via staffUserId (one-to-one), TimeOffRequest (one-to-many), Document (one-to-many), TimeEntry (one-to-many)

#### TimeOffRequest

| Field | Type | Notes |
|-------|------|-------|
| type | String | Required, values: VACATION, SICK, PERSONAL, BEREAVEMENT, OTHER |
| startDate | DateTime | Required |
| endDate | DateTime | Required |
| totalDays | Float | Required, computed (supports half-days) |
| reason | String? | |
| status | String | @default("PENDING"), values: PENDING, APPROVED, DENIED |
| reviewedById | String? | FK → User, manager who reviewed (use named relation `@relation("TimeOffReviewer")`) |
| reviewedAt | DateTime? | |
| reviewNotes | String? | |
| profileId | String | FK → EmployeeProfile |

Relations: EmployeeProfile (many-to-one), User via reviewedById (many-to-one, named relation)

#### Document

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| type | String | Required, values: OFFER_LETTER, CONTRACT, ID_DOCUMENT, TAX_FORM, POLICY, CERTIFICATION, OTHER |
| description | String? | |
| fileName | String? | Original file name (for future file upload) |
| fileUrl | String? | Storage URL (for future file upload) |
| expiresAt | DateTime? | For certifications/documents that expire |
| profileId | String? | FK → EmployeeProfile, null = company-wide document |

Relations: EmployeeProfile (many-to-one, optional)

#### TimeEntry

| Field | Type | Notes |
|-------|------|-------|
| date | DateTime | Required, the work date |
| clockIn | DateTime | Required |
| clockOut | DateTime? | Null = currently clocked in |
| breakMinutes | Int | @default(0) |
| totalHours | Float? | Computed: (clockOut - clockIn - break) in hours |
| notes | String? | |
| status | String | @default("PENDING"), values: PENDING, APPROVED, FLAGGED |
| profileId | String | FK → EmployeeProfile |

Relations: EmployeeProfile (many-to-one)

#### Announcement

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| content | String | Required, supports multi-line text |
| priority | String | @default("NORMAL"), values: NORMAL, IMPORTANT, URGENT |
| publishDate | DateTime | @default(now()) |
| expiresAt | DateTime? | Auto-hide after this date |
| pinned | Boolean | @default(false) |

Relations: none (visible to all users)

#### OnboardingChecklist

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required, e.g. "New Hire Onboarding" |
| description | String? | |

Relations: OnboardingItem (one-to-many), OnboardingAssignment (one-to-many)

#### OnboardingItem

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required, e.g. "Complete tax forms" |
| description | String? | Instructions or details |
| order | Int | Sort order within checklist |
| checklistId | String | FK → OnboardingChecklist, onDelete: Cascade |

Relations: OnboardingChecklist (many-to-one)

#### OnboardingAssignment

| Field | Type | Notes |
|-------|------|-------|
| checklistId | String | FK → OnboardingChecklist |
| profileId | String | FK → EmployeeProfile |
| completedAt | DateTime? | When all items done |

Relations: OnboardingChecklist (many-to-one), EmployeeProfile (many-to-one), OnboardingItemCompletion (one-to-many)

#### OnboardingItemCompletion

Tracks which items in an assignment are completed. Proper join model instead of comma-separated string.

| Field | Type | Notes |
|-------|------|-------|
| assignmentId | String | FK → OnboardingAssignment, onDelete: Cascade |
| itemId | String | FK → OnboardingItem, onDelete: Cascade |
| completedAt | DateTime | @default(now()) |

Relations: OnboardingAssignment (many-to-one), OnboardingItem (many-to-one)

Unique constraint: `@@unique([assignmentId, itemId])` — each item can only be completed once per assignment.

#### User relation fields to add

```
departments              Department[]
departmentHeads          Department[]          @relation("DepartmentHead")
employeeProfile          EmployeeProfile?      // one-to-one (singular, not array)
timeOffRequests          TimeOffRequest[]
timeOffRequestsReviewed  TimeOffRequest[]      @relation("TimeOffReviewer")
documents                Document[]
timeEntries              TimeEntry[]
announcements            Announcement[]
onboardingChecklists     OnboardingChecklist[]
onboardingItems          OnboardingItem[]
onboardingAssignments    OnboardingAssignment[]
onboardingItemCompletions OnboardingItemCompletion[]
```

## 4. Navigation

```
navItems:
  - Dashboard       /                HomeIcon
  - Directory       /directory       UsersIcon
  - Departments     /departments     BuildingIcon
  - Time Off        /time-off        CalendarIcon
  - Timekeeping     /timekeeping     ClockIcon
  - Documents       /documents       DocumentIcon
  - Onboarding      /onboarding      CheckCircleIcon
  - Announcements   /announcements   BellIcon
  - Settings        /settings        CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Total Employees (ACTIVE profiles), Pending Time-Off Requests, Employees On Leave Today, Open Onboarding Tasks
- **Upcoming time off**: Next 7 days of approved time-off with employee name, dates, type
- **Recent announcements**: Last 3 announcements (pinned first, then by date)
- **Active clock-ins**: Employees currently clocked in (clockOut is null) with clock-in time and duration
- **Birthdays / Anniversaries** (optional stretch): upcoming hire date anniversaries this month

#### Directory (`/directory`)

**List view:**
- Card grid or table view toggle
- Card shows: avatar (UserAvatar component), name, job title, department badge, email, phone, status badge
- Search by name, job title, or department
- Filter by department (dropdown) and status (tabs: All, Active, On Leave, Terminated)
- Sort by name, hire date, department

**Detail view** (`/directory/[id]`):
- Employee profile card: all personal info, job details, department, manager, hire date
- Employment details: type, hourly rate/salary, status
- Time-off summary: days taken by type this year, pending requests
- Recent time entries: last 2 weeks
- Documents: list of documents attached to this profile
- Onboarding progress: if assigned, show checklist completion

**Create** (modal or page — "Add Employee Profile"):
- Select existing User from dropdown (only users without a profile yet)
- Fields: employeeId*, jobTitle*, hireDate*, employmentType, departmentId, managerId (User dropdown), phone, emergencyContact, address/city/state/zip, hourlyRate, salary
- * = required

**Edit** (modal): same fields, pre-populated

**Terminate** (action button with ConfirmDialog): sets status to TERMINATED, sets terminatedDate

#### Departments (`/departments`)

**List view:**
- Card grid: department name, color dot, head (UserAvatar + name), employee count, description
- Search by name

**Create/Edit** (modal):
- Fields: name*, description, headId (User dropdown), color

**Delete:** ConfirmDialog — warn if department has employees

#### Time Off (`/time-off`)

**List view (admin/manager perspective):**
- Table columns: employee name, type (badge), start date, end date, total days, status (badge), submitted date
- Filter by status (tabs: All, Pending, Approved, Denied)
- Filter by type (dropdown)
- Sort by start date, submitted date

**My time off (employee perspective):**
- Summary: days remaining by type (if balance tracking is in settings)
- My requests list with status
- "Request Time Off" button

**Review flow:**
- Click pending request → detail view with employee info, dates, reason
- Approve / Deny buttons with optional notes
- On approve/deny: update status, set reviewedById, reviewedAt, reviewNotes

**Create** (modal — "Request Time Off"):
- Fields: type* (dropdown), startDate*, endDate*, reason
- Auto-compute totalDays

No edit after submission. Can delete own PENDING requests.

#### Timekeeping (`/timekeeping`)

**Current status panel (top of page):**
- If clocked in: show clock-in time, elapsed time, "Clock Out" button
- If not clocked in: "Clock In" button
- Clock in/out creates TimeEntry records

**Timesheet view:**
- Weekly table: rows = employees, columns = Mon-Sun, cells = hours worked
- Date range selector (week picker)
- Totals per employee, totals per day
- Status badges on entries (PENDING, APPROVED, FLAGGED)

**My time entries (employee perspective):**
- List of recent time entries with date, clock in, clock out, break, total hours, status
- Edit own PENDING entries (adjust clock in/out, break, notes)

**Admin actions:**
- Approve time entries (bulk approve for a week)
- Flag entries for review
- Add manual time entry for an employee

#### Documents (`/documents`)

**List view:**
- Table columns: title, type (badge), employee name (or "Company-Wide"), uploaded date, expires at
- Filter by type (dropdown)
- Filter: Employee docs vs Company-wide (tabs)
- Search by title

**Create** (modal):
- Fields: title*, type* (dropdown), description, profileId (employee dropdown, optional — leave blank for company-wide), expiresAt
- Note: actual file upload is a future feature — for now, store metadata only

**Edit/Delete:** standard CRUD

#### Onboarding (`/onboarding`)

**Checklist templates:**
- List of checklist templates with title, item count, active assignment count
- Create/edit checklist: title, description, ordered list of items (add/remove/reorder)

**Assignments:**
- Assign a checklist to an employee profile
- View assignment progress: checklist items with checkboxes, completion percentage
- Mark items complete (creates/deletes OnboardingItemCompletion records)

**Dashboard integration:** shows employees with incomplete onboarding

#### Announcements (`/announcements`)

**List view:**
- Cards: title, content preview, priority badge, publish date, pinned indicator
- Pinned announcements always at top
- Filter by priority (tabs: All, Normal, Important, Urgent)
- Expired announcements hidden by default (toggle to show)

**Create/Edit** (modal):
- Fields: title*, content* (textarea), priority (dropdown), publishDate (defaults to now), expiresAt, pinned (checkbox)

**Delete:** ConfirmDialog

#### Settings (`/settings`)

- Time-off balances/allocations per type (e.g., 15 vacation days, 10 sick days per year)
- Default break duration for timekeeping
- Pay period configuration (weekly, bi-weekly, monthly)
- Company info display

## 6. Status Workflows

#### Employee Status
```
ACTIVE (success/green) → ON_LEAVE (warning/amber) → ACTIVE
ACTIVE → TERMINATED (danger/red)
ON_LEAVE → TERMINATED
```
TERMINATED is final — no transition back.

#### Time-Off Request Status
```
PENDING (warning/amber) → APPROVED (success/green)
PENDING → DENIED (danger/red)
```
No transitions from APPROVED or DENIED.

#### Time Entry Status
```
PENDING (warning/amber) → APPROVED (success/green)
PENDING → FLAGGED (danger/red) → PENDING (after correction)
```

#### Announcement Priority (display only)
```
NORMAL (default/gray)
IMPORTANT (warning/amber)
URGENT (danger/red)
```

#### Document Type (display only)
```
OFFER_LETTER (info/blue)
CONTRACT (info/blue)
ID_DOCUMENT (default/gray)
TAX_FORM (default/gray)
POLICY (warning/amber)
CERTIFICATION (success/green)
OTHER (default/gray)
```

## 7. Seed Data

**Business:** "Brightside Marketing Agency" — 12-person creative agency

- **4 Departments:** Creative, Accounts, Operations, Executive (with distinct colors and department heads)
- **8 Employee Profiles:** linked to seeded Users
  - Mix of FULL_TIME (6), PART_TIME (1), CONTRACT (1)
  - 1 ON_LEAVE, 7 ACTIVE
  - Various job titles: Creative Director, Account Manager, Graphic Designer, Copywriter, Office Manager, Intern, etc.
  - Hire dates spanning last 3 years
  - Hourly rates ($18-$65) and salaries ($38k-$95k)
- **6 Time-Off Requests:**
  - 2 PENDING (for review demo)
  - 3 APPROVED (various types)
  - 1 DENIED
- **12 Time Entries:** over last 2 weeks for 4 employees, mix of PENDING and APPROVED
- **8 Documents:**
  - 3 company-wide (Employee Handbook, PTO Policy, Code of Conduct)
  - 5 employee-specific (offer letters, certifications)
  - 1 with upcoming expiration
- **1 Onboarding Checklist:** "New Hire Onboarding" with 8 items (tax forms, equipment setup, team introductions, training modules, etc.)
- **1 Onboarding Assignment:** assigned to the newest employee, 3 of 8 items completed
- **4 Announcements:**
  - 1 URGENT pinned: "Office closed Friday for maintenance"
  - 1 IMPORTANT: "Q1 all-hands meeting next Tuesday"
  - 2 NORMAL: "Welcome new team member", "Updated PTO policy"
  - 1 expired (to demo expiration)

## 8. AI Query Handlers

```
Handlers:
  - list_employees: Active employees with name, jobTitle, department, hireDate
  - employee_search: Search employees by name or jobTitle — accepts query parameter
  - pending_timeoff: Time-off requests with status PENDING — name, dates, type
  - employees_on_leave: Employees currently on approved time-off (today falls between startDate and endDate)
  - department_headcount: Employee count per department
  - recent_hires: Employees hired in last 90 days
```
