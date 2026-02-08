# GO4IT App Builder — Instructions for Claude Code

You are building a SaaS application for the GO4IT marketplace. A starter template with auth, config, and infrastructure files is already set up. Your job is to build the business logic.

## Progress Markers

Output these exact markers at the appropriate stages:

- `[GO4IT:STAGE:designing]` — FIRST, before writing any files. Plan the data model and pages.
- `[GO4IT:STAGE:coding]` — When you begin writing application code (pages, components, API routes)
- `[GO4IT:STAGE:database]` — When you create the seed data
- `[GO4IT:STAGE:finalizing]` — When doing final checks and cleanup
- `[GO4IT:STAGE:complete]` — LAST, when the app is fully built

## Pre-Built Files (already in the workspace)

These files exist and are fully functional. Do NOT recreate them. You may edit them where noted.

| File | Purpose | Edit? |
|---|---|---|
| `package.json` | All dependencies pre-installed | Update `name` and `description` only |
| `tsconfig.json` | TypeScript config with `@/*` paths | No |
| `next.config.ts` | `output: "standalone"` for Docker | No |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin | No |
| `.env.example` | DATABASE_URL + AUTH_SECRET | No |
| `Dockerfile` | Multi-stage node:20-alpine build | No |
| `docker-compose.yml` | Local Docker setup | No |
| `src/auth.ts` | NextAuth instance export | No |
| `src/auth.config.ts` | Credentials provider, JWT callbacks | No |
| `src/middleware.ts` | Route protection | Update `matcher` paths to match your app's routes |
| `src/lib/prisma.ts` | Prisma singleton | No |
| `src/components/SessionProvider.tsx` | Client-side session wrapper | No |
| `src/app/globals.css` | Tailwind import + `.gradient-brand` + `.gradient-brand-text` | No |
| `src/app/layout.tsx` | Root layout with SessionProvider + Toaster | Update `title` and `description` in metadata |
| `src/app/auth/page.tsx` | Login / signup page | No |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler | No |
| `src/app/api/auth/signup/route.ts` | Signup endpoint | No |
| `prisma/schema.prisma` | Base schema with User, Account, Session, VerificationToken | Add app-specific models below the marker line |
| `prisma/provision-users.ts` | Team member provisioning | No |

## What You Build

1. **Data model** — Add your app's models to `prisma/schema.prisma` below `// === Add app-specific models below this line ===`. Add relations to the User model as needed (e.g. `tasks Task[]`).
2. **Seed data** — Create `prisma/seed.ts` with 10-20 realistic records. Include an admin user: `admin@example.com` / `demo123` (bcrypt hashed). Run with `npx tsx prisma/seed.ts`.
3. **Pages** — Build the main dashboard (`src/app/page.tsx`), detail pages, and any feature-specific pages.
4. **Components** — Create `src/components/Header.tsx` with app navigation and any feature components.
5. **API routes** — Add feature-specific API routes under `src/app/api/`.
6. **Types** — Define interfaces in `src/types/index.ts`.
7. **Middleware** — Update the `matcher` array in `src/middleware.ts` to protect your app's authenticated routes.

## Tech Stack (locked — do not change)

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · SQLite · NextAuth v5 · Sonner

## Styling Rules

- Primary gradient: `gradient-brand` class (orange → pink → purple). Also available as `gradient-brand-text` for text.
- Or use Tailwind directly: `bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600`
- Page backgrounds: `bg-gray-50`. Cards: white with `rounded-xl shadow-sm`.
- Buttons: `rounded-xl` with `shadow-lg` on primary actions.
- UI feel: modern, clean, friendly — not corporate.
- Use Tailwind utility classes only. No custom CSS, no CSS modules.

**Tailwind CSS v4 `@theme` restrictions:**
- `@theme` blocks may ONLY contain flat CSS custom properties or `@keyframes`
- No nested selectors, no wildcard properties (`--color-*`), no `@dark` blocks inside `@theme`

## Quality Requirements

1. Every page must be functional — no placeholder content
2. All forms must validate inputs and show error states via `sonner` toasts
3. All API routes must check authentication
4. The app must start with: `npm install && npx prisma db push && npx tsx prisma/seed.ts && npm run dev`
5. Fully self-contained — no external APIs, no external databases

## What NOT to Do

- Do NOT recreate any pre-built files listed above
- Do NOT use external APIs or services
- Do NOT add analytics, tracking, or telemetry
- Do NOT create README.md or documentation files
- Do NOT use CSS modules or styled-components
- Do NOT add testing frameworks or test files
- Do NOT use `prisma migrate` — use `prisma db push`
- Do NOT use LibSQL adapter — use standard Prisma SQLite
- Do NOT use regex lookaheads in middleware matcher patterns (e.g. `(?!auth)`) — Next.js 16 does not support them. Use simple path patterns like `"/dashboard/:path*"`
