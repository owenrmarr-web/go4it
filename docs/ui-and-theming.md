# UI & Theming

Theme system, dark mode, CSS variables, avatar system, branded pages.

---

## Theme System

- CSS variables: `--theme-primary`, `--theme-secondary`, `--theme-accent`
- Extracted from uploaded org logos via `src/lib/colorExtractor.ts`
- Applied to: GO4IT logo, Create button, headings, progress bars, gradient backgrounds
- Account page applies active org's theme colors on tab switch

### Key files
- `src/components/ThemeProvider.tsx` — Dynamic theme colors → CSS variables
- `src/lib/colorExtractor.ts` — Logo color extraction
- `src/app/globals.css` — Tailwind imports, theme CSS variables, gradient utilities

## Dark Mode (deployed apps)

Added to all generated apps via template + `upgradeTemplateInfra` patches 12-17.

- `:root`/`.dark` CSS custom properties with `--g4-*` semantic tokens (surfaces, borders, text, accent, status colors)
- FOUC-preventing inline `<script>` in `layout.tsx` reads `localStorage('go4it-theme')` or `prefers-color-scheme`
- `ThemeToggle.tsx` floating button (fixed bottom-right, sun/moon icons)
- Auth/SSO pages use semantic token classes

### Template files
- `playbook/template/src/app/globals.css` — Semantic tokens
- `playbook/template/src/app/layout.tsx` — FOUC prevention script
- `playbook/template/src/components/ThemeToggle.tsx` — Toggle button

### Patch lessons learned
- `provision-users.ts` type expansion regex was fragile — use wholesale replacement
- `suppressHydrationWarning` must guard against duplicates
- ThemeToggle import regex must handle single and double quotes
- Role casing varies (`"member"` vs `"Member"`) — use `(?:member|Member)`
- **Always test `upgradeTemplateInfra` patches against ALL existing app source code** — source varies because Claude generates it

## Avatar System

- Profile photo upload OR emoji on preset color palette (10 colors, 20 emojis)
- Priority: photo > emoji > initials on profile color background
- Schema: `profileColor`, `profileEmoji`, `image` on User model
- Cross-platform sync planned (platform → deployed apps via `GO4IT_TEAM_MEMBERS`)

## Branded Pages

### Investor Deck (`src/app/deck/page.tsx`)
- Full pitch deck at `/deck` with competitive landscape, pricing model, product demo slides
- `/pitch` redirects to `/deck` (permanent redirect in `next.config.ts`)

### Pricing Calculator (`src/app/pricing/page.tsx`)
- Interactive cost comparison at `/pricing`
- Five competitors (HubSpot, Monday.com, Slack, FreshBooks, Gusto) with per-seat pricing
- Employee count + Number of Apps inputs
- Monthly/annual savings callouts, cost reduction multiplier

### Org Portal (`src/app/[slug]/page.tsx`)
- Single-segment slug paths load org portal
- Shows org's deployed apps with Launch buttons (SSO-powered)
- Pre-warms Fly.io machines on page load
- Protected by auth (non-org members get 403)
