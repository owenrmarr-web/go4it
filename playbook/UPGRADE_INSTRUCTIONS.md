# GoSuite App Infrastructure Upgrade Guide

## Overview

GoSuite apps share a common infrastructure layer (auth, SSO, team-sync, dark mode, data-import) that evolves over time. When the template gains new infrastructure features, each deployed GoSuite app needs to be upgraded to match.

This guide covers the Claude Code VSCode workflow for applying infrastructure upgrades.

## Pre-flight

1. Open the admin dashboard at **go4it.live/admin**
2. Go to the **Go Suite** tab — the **Infra** column shows each app's version
3. Compare to `currentInfraVersion` in `playbook/upgrades.json`

Apps showing an amber badge are behind and need upgrading.

## Upgrade Workflow

### Step 1: Open the app source in Claude Code VSCode

All GoSuite apps live in `/Users/owenmarr/go-suite/`:

| App | Path |
|-----|------|
| GoCRM | `/Users/owenmarr/go-suite/gocrm` |
| GoChat | `/Users/owenmarr/go-suite/gochat` |
| GoLedger | `/Users/owenmarr/go-suite/goledger` |
| GoSchedule | `/Users/owenmarr/go-suite/goschedule` |
| GoProject | `/Users/owenmarr/go-suite/goproject` |
| GoExpense | `/Users/owenmarr/go-suite/goexpense` |

New GoSuite apps should also be created here. See "Creating New GoSuite Apps" below.

### Step 2: Give Claude the upgrade instructions

Find the target version in `playbook/upgrades.json`. Copy the `claudeInstructions` field and paste it as your prompt to Claude Code.

Prefix with context:
> "This GoSuite app is currently at infrastructure version N. Apply upgrade to version M. Here are the instructions:"

### Step 3: Verify

After Claude applies the changes:

1. **Build check:** Run `npm run build` — must succeed with zero errors
2. **File checks:** Verify the conditions from `upgrades.json`:
   - `fileExists` — all listed files must exist
   - `fileContains` — listed strings must appear in the specified files
3. **Version bump:** Confirm `GO4IT_TEMPLATE_VERSION` in `src/lib/go4it.ts` matches the target version
4. **Local test (optional):** Run `npm run dev` and verify key flows work

### Step 4: Redeploy

Trigger a redeploy from the admin dashboard or org settings page. The deploy pipeline reads the new `GO4IT_TEMPLATE_VERSION` from the source and records it as `deployedInfraVersion` in the database.

### Step 5: Confirm

The admin dashboard Go Suite tab should now show the updated infra version for the app.

## Rules

- **Never skip versions.** If an app is at v2, apply v3 before v4. Check `dependsOn` in `upgrades.json`.
- **Always bump the version.** Update `GO4IT_TEMPLATE_VERSION` in `src/lib/go4it.ts` as the final step of each upgrade.
- **Always build.** Run `npm run build` after every upgrade. Never deploy an app that doesn't build.
- **Respect protected files.** Only modify files that the upgrade explicitly targets. See `playbook/CLAUDE.md` for the protected files list.
- **Infrastructure only.** Upgrades target auth, SSO, team-sync, dark mode, etc. — not app-specific pages, models, or components.

## Adding New Upgrades

When the template gains a new infrastructure feature:

1. Apply the feature to `playbook/template/` (the canonical template)
2. Bump `GO4IT_TEMPLATE_VERSION` in `playbook/template/src/lib/go4it.ts`
3. Add a new entry to `playbook/upgrades.json` with:
   - `version`: Increment by 1
   - `name` and `description`: What this upgrade does
   - `dependsOn`: Previous version number
   - `files`: Which files are modified/created
   - `verification`: Machine-checkable conditions
   - `claudeInstructions`: Natural language instructions for Claude VSCode
4. Update `currentInfraVersion` in `upgrades.json`
5. Apply to each GoSuite app using the workflow above
6. Redeploy each app and confirm the admin dashboard shows the new version

## Creating New GoSuite Apps

All GoSuite apps must be created in `/Users/owenmarr/go-suite/` so they're accessible for upgrades.

### Steps

1. Copy the template:
   ```bash
   cp -r /Users/owenmarr/go4it/playbook/template /Users/owenmarr/go-suite/<appname>
   ```

2. Open `/Users/owenmarr/go-suite/<appname>` in Claude Code VSCode

3. Build the app using the playbook at `go4it/playbook/CLAUDE.md`

4. Upload to the platform via the developer kit and approve as admin

5. Flag as Go Suite in the admin dashboard

The app starts at the current template version (v2) with all infrastructure pre-applied. No upgrade needed for new apps — they ship current.
