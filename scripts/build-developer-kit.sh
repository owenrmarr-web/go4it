#!/bin/bash
# Builds the GO4IT developer kit zip from playbook/ and template/
# Output: public/go4it-developer-kit.zip

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TMP_DIR=$(mktemp -d)
KIT_DIR="$TMP_DIR/go4it-developer-kit"

mkdir -p "$KIT_DIR/playbook"
mkdir -p "$KIT_DIR/template"

# Copy playbook
cp "$PROJECT_ROOT/playbook/CLAUDE.md" "$KIT_DIR/playbook/CLAUDE.md"

# Copy template (exclude .DS_Store and tsbuildinfo)
rsync -a --exclude='.DS_Store' --exclude='*.tsbuildinfo' "$PROJECT_ROOT/playbook/template/" "$KIT_DIR/template/"

# Write wrapper CLAUDE.md
cat > "$KIT_DIR/CLAUDE.md" << 'WRAPPER_EOF'
# GO4IT Developer Kit

You are building an app for the GO4IT marketplace — a platform where small businesses discover and deploy AI-generated SaaS tools. This developer kit gives you everything needed to build a GO4IT-compatible app.

## Quick Start

1. Copy all files from `template/` into your project root
2. Run `npm install`
3. Read `playbook/CLAUDE.md` for all build rules (tech stack, styling, schema conventions)
4. Build the app based on the user's requirements
5. Generate the `go4it.json` manifest (see below)
6. Test locally with `npm run dev`

## Build Rules

All technical rules are in `playbook/CLAUDE.md`. Follow them exactly — they ensure your app is compatible with GO4IT's deployment pipeline:

- **Next.js 16** with App Router
- **Tailwind CSS 4** with GO4IT brand palette
- **Prisma 6 + SQLite** for data
- **NextAuth** for authentication (pre-configured in the template)
- **Standalone Docker output** for deployment

## go4it.json — App Manifest (REQUIRED)

After building the app, create a `go4it.json` file in the project root with this exact structure:

```json
{
  "name": "Your App Name",
  "description": "A clear, concise description of what this app does (minimum 10 characters)",
  "category": "One of the valid categories listed below",
  "icon": "📄",
  "tags": ["lowercase", "keyword", "tags"]
}
```

### Fields

- **name** (required): The app's display name for the marketplace (e.g., "Invoice Tracker", "Team Scheduler")
- **description** (required): What the app does, in 1-2 sentences. Minimum 10 characters. Be specific but generic — describe the tool, not a specific business.
- **category** (required): Must be exactly one of these values:
  - `CRM / Sales`
  - `Project Management`
  - `Invoicing / Finance`
  - `Internal Chat`
  - `HR / People`
  - `Inventory`
  - `Scheduling / Bookings`
  - `Customer Support`
  - `Marketing / Analytics`
  - `Business Planning`
  - `Compliance / Legal`
  - `Document Management`
  - `Other`
- **icon** (required): A single emoji that represents the app (e.g., 📊 📋 💰 👥 📦 📅 🎯 🛠️ 📈 🏢 💬 🚀)
- **tags** (required): 3-6 lowercase keyword tags for search/filtering (e.g., ["invoicing", "finance", "billing", "payments"])

### Example

For a project management tool:
```json
{
  "name": "TaskFlow",
  "description": "Kanban-style project management with team assignments, due dates, and progress tracking",
  "category": "Project Management",
  "icon": "📋",
  "tags": ["project-management", "kanban", "tasks", "teams", "productivity"]
}
```

## Packaging for Upload

When the app is ready to upload to GO4IT:

1. Make sure `go4it.json` exists in the project root
2. Make sure the app builds cleanly: `npm run build`
3. Create a zip of the project, **excluding**:
   - `node_modules/`
   - `.next/`
   - `prisma/dev.db`
   - `.env` (contains secrets)
   - `.DS_Store`

Quick zip command:
```bash
zip -r my-app.zip . -x "node_modules/*" ".next/*" "prisma/dev.db" ".env" ".DS_Store" "*.tsbuildinfo"
```

4. Upload the zip at **go4it.live/developers**

## What NOT to Change

These files are pre-configured in the template and must not be modified:
- `src/auth.ts`, `src/auth.config.ts` — authentication
- `src/middleware.ts` — route protection
- `src/lib/prisma.ts` — database client
- `next.config.ts` — standalone output setting
- `Dockerfile` — deployment configuration

See `playbook/CLAUDE.md` for the complete list.

## Cross-App AI Queries (REQUIRED)

Every GO4IT app must include a working `/api/ai-query` endpoint. This enables the AI coworker (in GoChat and other apps) to query your app's data — for example, "What deals closed this month?" or "Any overdue invoices?"

The template already includes the endpoint scaffolding at `src/app/api/ai-query/route.ts` with:
- **Dual authentication** — user sessions + org secret for app-to-app calls
- **GET** — returns the app's query capabilities
- **POST** — accepts `{ query: string }`, routes to a matching handler

**Your job:** Add query handlers to the `handlers` object for each data model in your app. See the `playbook/CLAUDE.md` "AI Query Endpoint" section for the full spec, naming conventions, and examples.

### Quick Example

For an invoicing app, you'd add handlers like `list_invoices`, `overdue_invoices`, and `payment_summary`. Each returns `{ type, items, summary }` where `summary` is a one-line natural language description the AI can relay to users.
WRAPPER_EOF

# Write go4it.json.example
cat > "$KIT_DIR/go4it.json.example" << 'EXAMPLE_EOF'
{
  "name": "Invoice Tracker",
  "description": "Track and manage invoices, payments, and client billing for small businesses",
  "category": "Invoicing / Finance",
  "icon": "💰",
  "tags": ["invoicing", "finance", "billing", "payments", "clients"]
}
EXAMPLE_EOF

# Build zip
cd "$TMP_DIR"
zip -r "$PROJECT_ROOT/public/go4it-developer-kit.zip" "go4it-developer-kit/" -x "*.DS_Store"

# Cleanup
rm -rf "$TMP_DIR"

echo "Built: public/go4it-developer-kit.zip"
ls -la "$PROJECT_ROOT/public/go4it-developer-kit.zip"
