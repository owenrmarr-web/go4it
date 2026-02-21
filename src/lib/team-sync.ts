import crypto from "crypto";
import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

/**
 * Sync team members to a running Fly.io app.
 *
 * Fast path: direct HTTP POST to the deployed app's /api/team-sync endpoint
 *            (instant DB update, no restart needed).
 * Slow path: update GO4IT_TEAM_MEMBERS secret via builder → machine restart
 *            (fallback + ensures cold starts have the latest roster).
 */
export async function syncTeamMembersToFly(orgAppId: string): Promise<void> {
  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    include: {
      organization: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, password: true } } },
          },
        },
      },
      members: {
        include: {
          user: { select: { id: true, email: true } },
        },
      },
    },
  });

  if (!orgApp?.flyAppId) return;
  if (orgApp.status !== "RUNNING" && orgApp.status !== "PREVIEW") return;

  // Build set of assigned user IDs (those with OrgAppMember records for this app)
  const assignedUserIds = new Set(
    orgApp.members.map((m) => m.user.id)
  );

  // Full org roster with assigned flag — drives seat expansion in deployed apps
  // Include password hashes for all assigned members so they can sign in with platform credentials
  const teamMembers = orgApp.organization.members
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
      assigned: assignedUserIds.has(m.user.id),
      ...(m.user.password && assignedUserIds.has(m.user.id)
        ? { passwordHash: m.user.password }
        : {}),
    }));

  // --- Fast path: direct HTTP to deployed app's /api/team-sync ---
  if (orgApp.flyUrl && orgApp.authSecret) {
    try {
      const payload = JSON.stringify({ members: teamMembers });
      const signature = crypto
        .createHmac("sha256", orgApp.authSecret)
        .update(payload)
        .digest("hex");

      const res = await fetch(`${orgApp.flyUrl}/api/team-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-go4it-signature": signature,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        console.log(`[TeamSync] Direct sync succeeded for ${orgApp.flyAppId}`);
      } else {
        console.warn(`[TeamSync] Direct sync failed (${res.status}) for ${orgApp.flyAppId}, falling back to secrets`);
      }
    } catch (err) {
      console.warn(`[TeamSync] Direct sync error for ${orgApp.flyAppId}:`, err);
    }
  }

  // --- Slow path: update secrets via builder (always, as backup for cold starts) ---
  const secrets: Record<string, string> = {
    GO4IT_TEAM_MEMBERS: JSON.stringify(teamMembers),
  };

  if (BUILDER_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

    fetch(`${BUILDER_URL}/secrets/${orgApp.flyAppId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ secrets }),
    }).catch((err) => {
      console.error(`[TeamSync] Secrets fallback failed for ${orgApp.flyAppId}:`, err);
    });
  }
}

/**
 * Sync all deployed apps a user has access to (e.g. after password change).
 * Finds every OrgAppMember for this user and syncs each running app.
 */
export async function syncUserApps(userId: string): Promise<void> {
  const appMembers = await prisma.orgAppMember.findMany({
    where: { userId },
    include: { orgApp: { select: { id: true, status: true } } },
  });

  for (const { orgApp } of appMembers) {
    if (orgApp.status === "RUNNING" || orgApp.status === "PREVIEW") {
      syncTeamMembersToFly(orgApp.id).catch((err) => {
        console.error(`[TeamSync] Password sync failed for ${orgApp.id}:`, err);
      });
    }
  }
}

/**
 * Sync all running apps in an org after an org-level member change.
 * Removes the user from all OrgAppMember records in the org, then syncs each app.
 */
export async function removeUserFromOrgApps(
  organizationId: string,
  userId: string
): Promise<void> {
  // Find all OrgApps this user was a member of
  const affectedApps = await prisma.orgAppMember.findMany({
    where: {
      userId,
      orgApp: { organizationId },
    },
    select: { orgAppId: true },
  });

  // Remove user from all OrgAppMember records
  await prisma.orgAppMember.deleteMany({
    where: {
      userId,
      orgApp: { organizationId },
    },
  });

  // Sync each affected running app (fire-and-forget)
  for (const { orgAppId } of affectedApps) {
    syncTeamMembersToFly(orgAppId).catch((err) => {
      console.error(`[TeamSync] Failed to sync ${orgAppId}:`, err);
    });
  }
}
