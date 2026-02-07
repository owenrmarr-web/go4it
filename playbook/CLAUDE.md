# GO4IT App Builder — Instructions for Claude Code

You are building a self-contained SaaS application for the GO4IT marketplace. Follow these instructions exactly.

## Tech Stack (Required)

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js | 16 (App Router) |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | 4 |
| ORM | Prisma | 7 (client engine) |
| Database | SQLite | local file (`dev.db`) |
| Auth | NextAuth | v5 beta (credentials provider) |
| Toasts | Sonner | latest |

Do NOT use any other frameworks, databases, or auth systems. The app must run entirely from `npm run dev` with zero external dependencies.

## Progress Markers

As you work, output these exact markers at the appropriate stages so the GO4IT platform can track your progress:

- `[GO4IT:STAGE:designing]` — Output this FIRST, before writing any files. You are planning the architecture.
- `[GO4IT:STAGE:scaffolding]` — Output when you start creating the project structure (package.json, tsconfig, etc.)
- `[GO4IT:STAGE:coding]` — Output when you begin writing application code (pages, components, API routes)
- `[GO4IT:STAGE:database]` — Output when you create the Prisma schema and seed data
- `[GO4IT:STAGE:finalizing]` — Output when you are writing the Dockerfile and doing final checks
- `[GO4IT:STAGE:complete]` — Output as the LAST thing when the app is fully built

## Project Structure (Required)

Generate this exact file structure:

```
package.json
tsconfig.json
next.config.ts
postcss.config.mjs
tailwind.config.ts        (if needed for custom config)
Dockerfile
docker-compose.yml
.env.example
prisma/
  schema.prisma
  seed.ts
src/
  auth.ts                  — NextAuth instance
  auth.config.ts           — NextAuth config
  middleware.ts            — Route protection
  app/
    layout.tsx             — Root layout with providers
    page.tsx               — Main landing/dashboard page
    globals.css            — Tailwind imports + custom styles
    auth/page.tsx          — Login / signup page
    setup/page.tsx         — First-run setup wizard (company name, admin user)
    api/
      auth/[...nextauth]/route.ts
      auth/signup/route.ts
      (feature-specific API routes)
  components/
    Header.tsx
    SessionProvider.tsx
    (feature-specific components)
  lib/
    prisma.ts              — Prisma singleton
    (feature-specific utilities)
  types/
    index.ts               — TypeScript interfaces
```

## Styling Guidelines

- Use an orange → pink → purple gradient for primary brand elements (buttons, headers, accents)
- CSS class for gradient: `bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600`
- Background: light gray (`bg-gray-50`) for pages, white for cards
- Rounded corners: `rounded-xl` for cards and buttons
- Shadows: `shadow-sm` for cards, `shadow-lg` for elevated elements
- Font: use the system default (no custom fonts needed)
- The UI should feel modern, clean, and friendly — not corporate or enterprise
- Use Tailwind utility classes exclusively. No custom CSS except for the gradient utility and global resets.

**IMPORTANT: Tailwind CSS v4 PostCSS setup:**
- Install `@tailwindcss/postcss` (NOT `tailwindcss` as a PostCSS plugin)
- `postcss.config.mjs` must use `"@tailwindcss/postcss": {}` NOT `tailwindcss: {}`

`postcss.config.mjs`:
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Add this to `globals.css`:
```css
@import "tailwindcss";

.gradient-brand {
  background: linear-gradient(to right, #f97316, #ec4899, #9333ea);
}
```

**IMPORTANT: Tailwind CSS v4 `@theme` restrictions:**
- `@theme` blocks may ONLY contain flat CSS custom properties (e.g. `--color-primary: #fff;`) or `@keyframes` declarations
- Do NOT use nested selectors, wildcard properties (`--color-*`), or `@dark` blocks inside `@theme`
- Dark mode works automatically via the `dark:` variant — just add `class` strategy to the html element and use `dark:bg-gray-900` etc. No `@theme` configuration is needed for dark mode.

## Authentication Setup

Use NextAuth v5 with the credentials provider:
- Email + bcrypt-hashed password
- JWT session strategy
- Protected routes via middleware
- Setup wizard page (`/setup`) shown on first visit when no users exist
- The setup wizard creates the admin user and company profile

## Database

- Use Prisma with SQLite (`dev.db` file)
- Provider: `"sqlite"` in schema.prisma
- Include a `seed.ts` that populates realistic demo data
- Run seed with: `npx tsx prisma/seed.ts`
- DO NOT use LibSQL adapter — use standard Prisma SQLite

Prisma client setup in `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
```

## Dockerfile (Required)

Include this Dockerfile at the project root:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Include this `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./dev.db
      - AUTH_SECRET=change-me-in-production
    volumes:
      - app-data:/app/prisma
volumes:
  app-data:
```

## package.json Requirements

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "postinstall": "prisma generate"
  }
}
```

Include `"output": "standalone"` in `next.config.ts` for Docker compatibility:
```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone" };
export default nextConfig;
```

## .env.example

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-a-secret-here"
```

## Quality Requirements

1. Every page must be functional — no placeholder "coming soon" content
2. Include realistic seed data (at least 10-20 records for main entities)
3. All forms must validate inputs and show error states
4. All API routes must check authentication where appropriate
5. The app must start successfully with just: `npm install && npx prisma db push && npx tsx prisma/seed.ts && npm run dev`
6. The app must be fully self-contained — no external API calls, no external databases, no third-party services
7. Use `sonner` for toast notifications on user actions (save, delete, error, etc.)

## Team Member Provisioning (Required)

When a GO4IT organization deploys this app, team members need accounts. Include a `prisma/provision-users.ts` script that reads the `GO4IT_TEAM_MEMBERS` environment variable (JSON array of `{name, email}` objects) and creates User records with a default password.

`prisma/provision-users.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const raw = process.env.GO4IT_TEAM_MEMBERS;
  if (!raw) { console.log("No GO4IT_TEAM_MEMBERS set, skipping."); return; }

  const members: { name: string; email: string }[] = JSON.parse(raw);
  const password = await bcrypt.hash("go4it2026", 12);

  for (const member of members) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name },
      create: { email: member.email, name: member.name, password },
    });
    console.log(`Provisioned: ${member.name} (${member.email})`);
  }
  console.log(`Done — ${members.length} users provisioned.`);
}

main().finally(() => prisma.$disconnect());
```

The deployment pipeline sets `GO4IT_TEAM_MEMBERS` and runs this script after `prisma db push`. Users log in with their GO4IT email and the default password `go4it2026`.

## What NOT to Do

- Do NOT use any external APIs or services (no Stripe, no SendGrid, no external DBs)
- Do NOT use `app/api/` routes for things that can be done with server actions or direct DB queries
- Do NOT add analytics, tracking, or telemetry
- Do NOT create a README.md or documentation files
- Do NOT use CSS modules or styled-components — Tailwind only
- Do NOT add testing frameworks or test files (keep scope small)
- Do NOT use `prisma migrate` — use `prisma db push` for simplicity
