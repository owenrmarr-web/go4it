# GoForms — App Spec

## 1. Identity

```
App Name: GoForms
Emoji: 📝
Category: Forms / Surveys
Tagline: Custom forms, surveys, and checklists with submission tracking and response analytics
Tags: forms, surveys, checklists, submissions, analytics, feedback, small-business
```

## 2. Domain Boundaries

```
OWNS: Form builder, surveys, checklists, submission tracking, response analytics, form templates
DOES NOT OWN: Support tickets (GoSupport), employee onboarding forms (GoHR), email campaigns (GoMailer)
```

## 3. Entities

NOTE: Every model inherits `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, and `userId String` + `user User @relation(...)` from the playbook. These are omitted from field tables below.

#### Form

| Field | Type | Notes |
|-------|------|-------|
| title | String | Required |
| description | String? | Shown at top of form |
| type | String | @default("FORM"), values: FORM, SURVEY, CHECKLIST |
| status | String | @default("DRAFT"), values: DRAFT, ACTIVE, CLOSED, ARCHIVED |
| slug | String | Required, URL-friendly, unique per user |
| submissionCount | Int | @default(0), denormalized count |
| allowMultiple | Boolean | @default(false), allow same person to submit multiple times |
| requireName | Boolean | @default(true) |
| requireEmail | Boolean | @default(true) |
| closedAt | DateTime? | When form was closed |
| closedMessage | String? | Message shown when form is closed |

Relations: FormField (one-to-many), Submission (one-to-many)

#### FormField

A single field/question within a form. Ordered by `order` field.

| Field | Type | Notes |
|-------|------|-------|
| label | String | Required, the question text |
| type | String | Required, values: TEXT, TEXTAREA, NUMBER, EMAIL, DATE, SELECT, MULTI_SELECT, CHECKBOX, RADIO, RATING |
| required | Boolean | @default(false) |
| placeholder | String? | Hint text for input fields |
| options | String? | JSON string array for SELECT, MULTI_SELECT, RADIO (e.g. `["Option A","Option B","Option C"]`) |
| order | Int | @default(0), sort position |
| formId | String | FK → Form, onDelete: Cascade |

Relations: Form (many-to-one), FieldResponse (one-to-many)

#### Submission

A completed form response.

| Field | Type | Notes |
|-------|------|-------|
| formId | String | FK → Form |
| respondentName | String? | |
| respondentEmail | String? | |
| status | String | @default("COMPLETE"), values: COMPLETE, REVIEWED, FLAGGED |
| notes | String? | Internal notes about this submission |

Relations: Form (many-to-one), FieldResponse (one-to-many)

#### FieldResponse

A single answer within a submission.

| Field | Type | Notes |
|-------|------|-------|
| value | String | Required, the answer (stored as string — numbers and dates serialized) |
| submissionId | String | FK → Submission, onDelete: Cascade |
| fieldId | String | FK → FormField, onDelete: Cascade |

Relations: Submission (many-to-one), FormField (many-to-one)

#### User relation fields to add

```
forms           Form[]
formFields      FormField[]
submissions     Submission[]
fieldResponses  FieldResponse[]
```

## 4. Navigation

```
navItems:
  - Dashboard    /              HomeIcon
  - Forms        /forms         DocumentIcon
  - Submissions  /submissions   InboxIcon
  - Analytics    /analytics     ChartBarIcon
  - Settings     /settings      CogIcon
```

## 5. Features

#### Dashboard (`/`)

- **Summary cards** (4): Active Forms, Total Submissions (this month), Submissions Today, Flagged for Review
- **Recent submissions**: Last 5 submissions with form title, respondent name/email, submitted date, status badge
- **Form performance**: Active forms with submission count, latest submission date
- **Needs review**: Submissions with FLAGGED status

#### Forms (`/forms`)

**List view:**
- Table columns: title, type (badge), status (badge), field count, submission count, created date, last submission
- Filter by status (tabs: All, Draft, Active, Closed, Archived)
- Filter by type (dropdown: All, Form, Survey, Checklist)
- Search by title
- Sort by title, created date, submission count

**Detail view** (`/forms/[id]`):
- Form header: title, description, type badge, status badge, slug
- **Fields tab**: ordered list of form fields with type icons, label, required indicator, options preview
  - Drag-to-reorder (or up/down buttons)
  - Add field button → field editor modal
  - Edit/delete each field
- **Submissions tab**: table of submissions for this form — respondent name, email, date, status badge, link to view
- **Analytics tab**: per-field response summary
  - TEXT/TEXTAREA: response count
  - NUMBER: min, max, average
  - SELECT/RADIO/MULTI_SELECT: bar chart of option counts
  - RATING: average rating, distribution
  - CHECKBOX: yes/no count
- Actions based on status:
  - DRAFT: Edit, Activate (→ACTIVE), Delete
  - ACTIVE: Edit Fields, Close (→CLOSED), Share (show form URL/slug)
  - CLOSED: Reopen (→ACTIVE), Archive (→ARCHIVED)
  - ARCHIVED: Restore (→DRAFT)

**Create** (modal):
- Fields: title*, description, type (dropdown, default FORM), requireName, requireEmail, allowMultiple
- Auto-generate slug from title

**Edit** (same modal, pre-populated):
- Can edit title, description, settings at any time
- Can edit fields when DRAFT or ACTIVE

**Delete:** Only when DRAFT or no submissions — ConfirmDialog

#### Form Field Editor (modal, accessed from form detail)

- Fields: label*, type* (dropdown), required (checkbox), placeholder, options (shown for SELECT/MULTI_SELECT/RADIO — add/remove/reorder option values)
- Preview of how the field will render

#### Submissions (`/submissions`)

**List view (across all forms):**
- Table columns: form title, respondent name, respondent email, submitted date, status (badge)
- Filter by form (dropdown)
- Filter by status (tabs: All, Complete, Reviewed, Flagged)
- Search by respondent name or email
- Date range filter
- Sort by submitted date (newest first)

**Detail view** (`/submissions/[id]`):
- Form title and respondent info
- All field responses displayed as label → value pairs
- Status badge with actions: Mark Reviewed, Flag, Unflag
- Internal notes field (editable)

**No create** — submissions come from form respondents
**Delete:** ConfirmDialog

#### Analytics (`/analytics`)

**Per-form analytics** (select form from dropdown):
- Submission count over time (daily for last 30 days)
- Completion rate (if applicable)
- Per-field breakdowns:
  - SELECT/RADIO: pie or bar chart of selections
  - RATING: average + distribution
  - NUMBER: min/max/avg
  - CHECKBOX: yes/no percentages
- Respondent list with submission dates

**Cross-form summary:**
- Total submissions per form (bar chart)
- Most active forms
- Submission trend over time

All analytics are read-only views.

#### Settings (`/settings`)

- Default form type (FORM, SURVEY, CHECKLIST)
- Default require name/email settings
- Closed form message default
- Submission notification preferences

## 6. Status Workflows

#### Form Status
```
DRAFT (default/gray) → ACTIVE (success/green) → CLOSED (warning/amber) → ARCHIVED (default/gray)
CLOSED → ACTIVE (reopen)
ARCHIVED → DRAFT (restore)
```
- ACTIVE forms accept submissions
- CLOSED forms show the closedMessage
- ARCHIVED forms are hidden from default views

#### Submission Status
```
COMPLETE (success/green) → REVIEWED (info/blue)
COMPLETE → FLAGGED (danger/red) → REVIEWED
FLAGGED → COMPLETE (unflag)
```

#### Form Field Type (display only)
```
TEXT (default/gray)
TEXTAREA (default/gray)
NUMBER (info/blue)
EMAIL (info/blue)
DATE (info/blue)
SELECT (warning/amber)
MULTI_SELECT (warning/amber)
CHECKBOX (success/green)
RADIO (warning/amber)
RATING (warning/amber)
```

## 7. Seed Data

**Business:** "Evergreen Wellness Spa" — day spa and wellness center collecting client feedback and intake forms

- **4 Forms:**
  - "Client Intake Form" (FORM, ACTIVE) — 8 fields: name, email, phone, date of birth, allergies/conditions (textarea), preferred services (multi_select: Massage, Facial, Body Wrap, Aromatherapy), first visit (checkbox), referral source (select: Google, Friend, Social Media, Other)
  - "Post-Visit Satisfaction Survey" (SURVEY, ACTIVE) — 6 fields: overall experience (rating), staff friendliness (rating), facility cleanliness (rating), value for money (rating), would recommend (radio: Yes, No, Maybe), additional feedback (textarea)
  - "Event Planning Checklist" (CHECKLIST, DRAFT) — 5 fields: venue confirmed (checkbox), catering ordered (checkbox), invitations sent (checkbox), decorations ready (checkbox), notes (textarea)
  - "Monthly Newsletter Signup" (FORM, ARCHIVED) — 3 fields: name, email, preferred topics (multi_select)
- **15 Submissions:** spread across active forms
  - "Client Intake Form": 6 submissions with realistic client data
  - "Post-Visit Satisfaction Survey": 8 submissions with varied ratings (3-5 stars)
  - "Monthly Newsletter Signup": 1 submission (before it was closed)
  - Mix of statuses: 10 COMPLETE, 3 REVIEWED, 2 FLAGGED
  - Respondent names and emails realistic
- **FieldResponses:** 4-8 per submission matching the form's fields
  - Survey ratings: mostly 4-5 stars, one 3-star with feedback about wait times
  - Intake forms: varied ages, different service preferences, some with allergy notes

## 8. AI Query Handlers

```
Handlers:
  - list_forms: All forms with title, type, status, submissionCount
  - active_forms: Forms with status ACTIVE — title, fieldCount, submissionCount
  - recent_submissions: Submissions from last 7 days with formTitle, respondentName, respondentEmail, submittedAt
  - form_stats: Per-form submission count and last submission date
  - flagged_submissions: Submissions with status FLAGGED — formTitle, respondentName, notes
  - submission_search: Search submissions by respondent name or email — accepts query parameter
```
