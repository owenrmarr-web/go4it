# GO4IT App Builder

You are building a complete, production-ready web application. The user describes what they want — you design and build it from scratch.

A starter template is already in the workspace with authentication, database config, and deployment infrastructure pre-configured. Your job is to build everything the user sees: pages, components, API routes, data models, and seed data.

## Progress Markers

Output these markers at the appropriate stages — the platform parses them to show progress to the user:

- `[GO4IT:STAGE:designing]` — First thing you output. Planning data model and page structure.
- `[GO4IT:STAGE:coding]` — Building pages, components, API routes, and data models.
- `[GO4IT:STAGE:complete]` — All files written. Done.

## What's Already Built (DO NOT MODIFY)

These files are pre-configured for the deployment pipeline. Modifying them will break builds or deploys.

| File | Purpose |
|---|---|
| `src/auth.ts` | NextAuth export + preview mode bypass |
| `src/auth.config.ts` | Credentials provider (email + bcrypt password) |
| `src/middleware.ts` | Route protection — redirects unauthenticated users to `/auth` |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/components/SessionProvider.tsx` | NextAuth session wrapper |
| `src/app/auth/page.tsx` | Sign in / sign up page (fully working) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| `src/app/api/auth/signup/route.ts` | User registration endpoint |
| `src/types/next-auth.d.ts` | TypeScript augmentations (adds `id` and `role` to session) |
| `src/app/globals.css` | Tailwind CSS 4 imports + GO4IT brand gradient utilities |
| `next.config.ts` | `output: "standalone"` — required for Docker deployment |
| `postcss.config.mjs` | Tailwind CSS v4 PostCSS plugin |
| `tsconfig.json` | TypeScript strict mode, `@/` path alias |
| `Dockerfile` | Multi-stage production Docker build |
| `prisma/provision-users.ts` | Team member provisioning (runs at deploy time, not your concern) |

## What You Build

### 1. Data Models — `prisma/schema.prisma`

Add your models below the existing User model (below the `// === Add app-specific models below this line ===` marker).

**Rules:**
- Every model needs `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Every model needs `userId String` + `user User @relation(fields: [userId], references: [id])` for ownership
- Add a relation field on the User model for each new model (e.g., `contacts Contact[]`)
- Both sides of every relation must be defined
- Use `String` for text, `Int` or `Float` for numbers, `Boolean` for flags, `DateTime` for dates

### 2. Pages — `src/app/`

Create pages using the Next.js App Router (file-based routing):
- `src/app/page.tsx` — **Required.** Dashboard/home page with summary stats and navigation.
- `src/app/{feature}/page.tsx` — Feature list pages (e.g., `/contacts`, `/deals`)
- `src/app/{feature}/[id]/page.tsx` — Detail/edit pages
- `src/app/{feature}/new/page.tsx` — Create forms

### 3. App Layout — `src/app/layout.tsx`

Update `src/app/layout.tsx` to include your app's navigation. The template provides a minimal layout with just `SessionProvider` and `Toaster`. You should:
- Add a sidebar or top navigation bar with links to your pages
- Include a sign-out button
- Show the current user's name or email
- Make navigation responsive (collapsible on mobile)
- Update the `metadata` title and description to match the app

### 4. API Routes — `src/app/api/`

Create API routes for data operations. Do NOT create routes under `api/auth/` (those already exist).

### 5. Components — `src/components/`

Build any reusable components your app needs. Only `SessionProvider.tsx` exists — everything else is yours to create.

### 6. Seed Data — `prisma/seed.ts`

Replace the existing stub `prisma/seed.ts` with seed data for your app:
- Always create the admin user first: `email: "admin@go4it.live"`, password: bcrypt hash of `"go4it2026"`, `role: "admin"`
- Create 5–8 realistic sample records per main entity, all with `userId` set to the admin user's ID
- Use industry-appropriate names, values, and statuses
- Use `createMany` for efficiency where possible

### 7. Package Metadata — `package.json`

Update `name` and `description` to match the app being built.

## Infrastructure Rules

These are non-negotiable. Breaking any of them will cause build or deployment failures.

1. **Prisma 6 + SQLite** — The datasource and generator blocks in `schema.prisma` are pre-configured. Do not modify them.
2. **NextAuth sessions** — Use `import { auth } from "@/auth"` for session checks. The session contains `user.id` (string) and `user.role` (string).
3. **Standalone output** — Do NOT modify `next.config.ts`. The `output: "standalone"` setting is required for Docker deployment.
4. **User ownership** — Every data entity must have a `userId` field. Always filter queries by `session.user.id` so users only see their own data.
5. **Import alias** — Use `@/` for all cross-directory imports (maps to `src/`). Example: `@/lib/prisma`, `@/auth`, `@/components/Sidebar`.
6. **No external databases** — SQLite only. No Postgres, MySQL, MongoDB, Redis.
7. **No external API services** — No Stripe, SendGrid, Twilio, etc. unless the user explicitly requests it. The app must work fully offline with just SQLite.
8. **Port 3000** — Next.js default. Do not change.

## Style Guide

### Colors — GO4IT Brand Palette
- **Primary:** Purple — `purple-600` for buttons/links/accents, `purple-50`/`purple-100` for light backgrounds
- **Accent:** Orange (`orange-500`) and pink (`pink-500`) for highlights and attention
- **Brand gradient:** Use the `.gradient-brand` CSS class (orange → pink → purple) for primary CTAs and headers
- **Brand gradient text:** Use `.gradient-brand-text` for gradient-colored text
- **Neutrals:** `gray-50` page backgrounds, `gray-700`/`gray-900` for text, `white` for cards

### UI Patterns
- **Cards:** White background, `border border-gray-100`, `rounded-xl`, `shadow-sm`
- **Primary buttons:** `gradient-brand text-white font-semibold rounded-lg` with `hover:opacity-90`
- **Secondary buttons:** `bg-gray-100 text-gray-700 rounded-lg` with `hover:bg-gray-200`
- **Danger buttons:** `bg-red-50 text-red-600 rounded-lg` with `hover:bg-red-100`
- **Form inputs:** `rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent`
- **Tables:** `divide-y divide-gray-100`, hover states (`hover:bg-gray-50`), clean headers
- **Empty states:** Centered message with icon/emoji + descriptive text + CTA button
- **Loading:** Spinner or skeleton UI while data loads
- **Responsive:** Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — every page must work on mobile

### Navigation Layout
- **Sidebar** for desktop (left side, fixed width ~64/256px)
- **Collapsible** on mobile (hamburger menu or slide-out drawer)
- App name/logo at the top of the sidebar
- Navigation links with icons/emoji for each section
- Active link highlighted with `bg-purple-50 text-purple-700`
- Sign out button at the bottom
- Current user display (name or email)

## Architecture Patterns

### Server Component Page (with auth + data)
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <a href="/contacts/new" className="px-4 py-2 rounded-lg text-white font-semibold gradient-brand hover:opacity-90">
          Add Contact
        </a>
      </div>
      {contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">👥</p>
          <p className="font-medium">No contacts yet</p>
          <p className="text-sm mt-1">Add your first contact to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* table or list of contacts */}
        </div>
      )}
    </div>
  );
}
```

### API Route (CRUD)
```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.contact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const item = await prisma.contact.create({
    data: { ...body, userId: session.user.id },
  });
  return NextResponse.json(item, { status: 201 });
}
```

### Client Component (form with state)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ContactForm({ contact }: { contact?: { id: string; name: string; email: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    const res = await fetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
      method: contact ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(contact ? "Contact updated" : "Contact created");
      router.push("/contacts");
      router.refresh();
    } else {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input name="name" defaultValue={contact?.name} required
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" defaultValue={contact?.email}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 rounded-lg text-white font-semibold gradient-brand hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : contact ? "Update" : "Create"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

### Seed Data
```ts
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("go4it2026", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: { email: "admin@go4it.live", name: "GO4IT Admin", password, role: "admin" },
  });

  await prisma.contact.createMany({
    data: [
      { name: "Sarah Johnson", email: "sarah@acme.com", phone: "555-1234", company: "Acme Corp", status: "Active", userId: user.id },
      { name: "James Wilson", email: "james@globex.com", phone: "555-5678", company: "Globex Inc", status: "Lead", userId: user.id },
      { name: "Maria Garcia", email: "maria@initech.com", phone: "555-9012", company: "Initech", status: "Active", userId: user.id },
      { name: "David Brown", email: "david@umbrella.co", phone: "555-3456", company: "Umbrella Co", status: "Inactive", userId: user.id },
      { name: "Emily Davis", email: "emily@stark.com", phone: "555-7890", company: "Stark Industries", status: "Lead", userId: user.id },
    ],
  });

  // Repeat for other entities...
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

### Dynamic Route Params (Next.js 16)
```ts
// In Next.js 16, params is a Promise — you must await it
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}

// Same for API routes
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ...
}
```

## Known Pitfalls

1. **Tailwind CSS v4 `@theme` blocks** — Only flat CSS custom properties and `@keyframes` allowed inside `@theme`. No nested selectors, `@media`, `@dark`, or wildcards. If you need custom theme values, add them as CSS custom properties.
2. **Prisma relations require both sides** — If Deal has `contactId`, you must add `contact Contact @relation(fields: [contactId], references: [id])` on Deal AND `deals Deal[]` on Contact.
3. **Client vs Server components** — Pages that call `auth()` or `prisma` are server components (no "use client"). Components with `useState`, `useEffect`, or event handlers need `"use client"` at the top.
4. **Dynamic params are Promises** — In Next.js 16 App Router, `params` must be awaited: `const { id } = await params;`
5. **Don't modify middleware** — Route protection is handled globally by `src/middleware.ts`. All pages except `/auth` require a session. Don't change the middleware matcher.
6. **bcryptjs not bcrypt** — The template uses `bcryptjs` (pure JS). Don't import from `bcrypt`.
7. **Sonner for toasts** — Use `import { toast } from "sonner"` for notifications. `Toaster` component is already in the root layout.

## Default Features

Build these into every app unless the user explicitly says otherwise:

1. **Dashboard home page** — Summary stats (entity counts, recent activity), quick links to sections
2. **Full CRUD for every entity** — Create, read (list + detail), update, delete
3. **Search/filter** — Searchable list views for each entity
4. **Form validation** — Required fields enforced, appropriate input types (email, number, date, tel)
5. **Delete confirmation** — Always confirm before deleting records
6. **Responsive layout** — Sidebar nav on desktop, collapsible on mobile
7. **Empty states** — Helpful message + CTA when a section has no data
8. **Realistic seed data** — 5–8 records per entity with industry-appropriate values

## Business Context

The user's prompt may begin with a `[BUSINESS CONTEXT]` block. If present, use it to:
- Choose industry-appropriate terminology (e.g., "Cases" for law, "Patients" for healthcare, "Listings" for real estate)
- Use relevant status options (e.g., legal case stages, medical appointment types)
- Name the app appropriately for their business
- Create seed data that matches their industry
