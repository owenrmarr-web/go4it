# Auth & Teams

NextAuth setup, SSO for deployed apps, invitations, team member sync, roles, member onboarding, password flows.

---

## Platform Auth

- **NextAuth v5 beta** with credentials + Google providers
- JWT session strategy
- Protected routes: `/account`, `/admin`, org portal pages (`/[slug]`)
- Public routes explicitly listed in `src/auth.config.ts`: `/create`, `/pricing`, `/deck`, `/bugs`, `/contact`, `/developer`, `/leaderboard`, `/forgot-password`, `/reset-password`, `/verify-email`, `/invite`, `/join`, `/org`, `/privacy`

### Key files
- `src/auth.ts` — NextAuth instance export
- `src/auth.config.ts` — Config: credentials provider, `authorized` callback, public route list
- `src/middleware.ts` — Protects routes (uses `auth.config.ts` logic)

## Google OAuth

- **Provider:** `next-auth/providers/google` with `allowDangerousEmailAccountLinking: true`
- Account linking: if a credentials user signs in with Google using the same email, PrismaAdapter merges the accounts automatically (safe because Google verifies email ownership)
- **Profile completion sentinel:** `user.username === null` → `profileComplete: false` in JWT → middleware redirects to `/auth/complete-profile`
- New Google users skip the signup form and land on `/auth/complete-profile` to fill in username, company, location, use cases
- **Middleware gap:** The middleware uses `NextAuth(authConfig).auth` which has no `session` callback. Custom JWT fields (`profileComplete`) must be explicitly mapped in the `session` callback inside `authConfig` (not just `auth.ts`) so the middleware can read them from `auth.user`
- **Session refresh after profile completion:** Client calls `update({ profileComplete: true })` from `useSession()` → `jwt` callback handles `trigger === "update"` to set `token.profileComplete = true` without re-login
- Google OAuth is in "Testing" mode — up to 100 test users. Submit for verification via Google Cloud Console to lift the limit (requires privacy policy URL: `https://go4it.live/privacy`)
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set in Vercel)
- Credentials file stored at `~/go4it-secrets/google-oauth-client-secret.json` (outside repo)

### Key files
- `src/auth.ts` — Google provider config, `signIn`/`jwt`/`session` callbacks
- `src/app/auth/page.tsx` — "Continue with Google" button (above email form with "or" divider)
- `src/app/auth/complete-profile/page.tsx` — Profile completion form for new Google users
- `src/app/api/auth/complete-profile/route.ts` — POST endpoint: validates username, creates org if company provided, updates User record

## Email Verification

- On signup: redirect to `/verify-email` → Resend sends branded verification email → click link validates token → sets `emailVerified` → redirect to `/auth?verified=true`
- Unverified users cannot sign in (`admin@go4it.live` bypassed)
- Anti-enumeration on resend endpoint

### Key files
- `src/lib/verification.ts` — Token helper
- `src/app/api/auth/verify/route.ts` — Validates token
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/verify-email/page.tsx`

## Forgot Password

- `/forgot-password` → enter email → branded email via Resend with reset link (1-hour expiry) → `/reset-password` → new password → auto-redirect to login
- Anti-enumeration (always returns success)
- Uses `VerificationToken` model (no schema changes)

### Key files
- `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`
- `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`
- `src/lib/email.ts` — `sendPasswordResetEmail`

## Organizations & Roles

- 1:1 org simplification: auto-created on signup when company name provided
- Roles: OWNER, ADMIN, MEMBER
- Account page visibility is role-based: Owner sees everything, Admin sees team management + deploy, Member sees apps with Launch/Visit only
- Multi-org support: tabbed org navigation on account page when user has 2+ orgs

### Key files
- `src/app/account/page.tsx` — Role-based dashboard
- `src/app/api/account/org/route.ts` — GET org + apps + members + invitations
- `src/app/api/account/orgs/route.ts` — Lightweight org list
- `src/contexts/ActiveOrgContext.tsx` — Active org state + localStorage persistence

## Team Invitations

- Invite via email (Resend) from Account page
- Invite link → `/invite/[token]` smart routing:
  - Existing users → "Sign In & Accept" → `/auth?callbackUrl=/invite/{token}`
  - New users → "Get Started" → `/join/{token}`

### Key files
- `src/app/invite/[token]/page.tsx` — Accept invitation
- `src/app/api/invite/[token]/route.ts` — Invitation API
- `src/lib/email.ts` — Invite template

## Member Onboarding

- `/join/[token]` page: pre-filled name/email, password, profile photo upload OR emoji avatar on color palette (10 colors, 20 emojis)
- On submit: account + org membership + invitation accepted in single transaction → auto sign-in → redirect to `/account`
- Avatar priority: photo > emoji > initials on profile color
- Auto-generates username from name (with collision handling)
- Schema: `profileColor`, `profileEmoji` on User model

### Key files
- `src/app/join/[token]/page.tsx`
- `src/app/api/auth/join/route.ts`

## SSO for Deployed Apps

- Platform "Visit" button passes signed JWT to deployed app's `/sso` endpoint
- App validates signature, auto-signs user in via NextAuth, redirects to `/`
- Template files: `playbook/template/src/app/sso/page.tsx`, `playbook/template/src/app/api/auth/sso/route.ts`
- `upgradeTemplateInfra` patches 9-11 add SSO to existing apps on redeploy

## Team Member Sync

### Real-time (direct HTTP)
- Platform POSTs to deployed app's `/api/team-sync` endpoint with HMAC-SHA256 signed payload
- App updates `User.isAssigned` in SQLite immediately
- Session enforcement: `auth.config.ts` re-checks `isAssigned` on every `auth()` call — removed users blocked mid-session
- `upgradeTemplateInfra()` patches 5-6 add this to existing apps

### Secrets fallback (cold start)
- `syncTeamMembersToFly()` in `src/lib/team-sync.ts` updates `GO4IT_TEAM_MEMBERS` Fly.io secret
- Secret update triggers machine restart → `start.sh` re-provisions users
- Hooked into OrgApp member PUT and org member DELETE endpoints

### Team member awareness in generated apps
- Deployed apps receive full org roster via `GO4IT_TEAM_MEMBERS` (not just assigned members)
- Each user has `isAssigned` boolean
- Unassigned members appear in staff lists with "Not on plan" badge, cannot log in
- "Request Access" flow (`AccessRequest` model + `/api/access-requests`) notifies account owner

### Key files
- `src/lib/team-sync.ts` — Sync orchestration
- `playbook/template/src/app/api/team-sync/route.ts` — Deployed app endpoint

## Usernames

- 3-20 chars, lowercase + numbers + underscores
- Auto-generated from name on signup
- Required for app generation (modal prompt if missing)
- Reserved name list in `src/lib/username.ts`

### Key files
- `src/lib/username.ts` — Validation + uniqueness check via Prisma
- `src/lib/username-utils.ts` — Pure utilities (safe for client-side import)
