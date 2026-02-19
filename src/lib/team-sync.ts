import prisma from "@/lib/prisma";

const BUILDER_URL = process.env.BUILDER_URL;
const BUILDER_API_KEY = process.env.BUILDER_API_KEY;

/**
 * Sync team members to a running Fly.io app by updating GO4IT_TEAM_MEMBERS secret.
 * Called when OrgApp members change — no redeploy needed, just a secret update + restart.
 */
export async function syncTeamMembersToFly(orgAppId: string): Promise<void> {
  const orgApp = await prisma.orgApp.findUnique({
    where: { id: orgAppId },
    include: {
      organization: {
        include: {
          members: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { email: true, password: true } } },
          },
        },
      },
      members: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!orgApp?.flyAppId) return;
  if (orgApp.status !== "RUNNING" && orgApp.status !== "PREVIEW") return;

  const ownerMember = orgApp.organization.members[0];
  const ownerEmail = ownerMember?.user.email;
  const ownerPasswordHash = ownerMember?.user.password;

  const teamMembers = orgApp.members
    .filter((m) => m.user.email)
    .map((m) => ({
      name: m.user.name || m.user.email!,
      email: m.user.email!,
      ...(m.user.email === ownerEmail && ownerPasswordHash
        ? { passwordHash: ownerPasswordHash }
        : {}),
    }));

  const secrets: Record<string, string> = {
    GO4IT_TEAM_MEMBERS: JSON.stringify(teamMembers),
  };

  if (BUILDER_URL) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (BUILDER_API_KEY) headers["Authorization"] = `Bearer ${BUILDER_API_KEY}`;

    await fetch(`${BUILDER_URL}/secrets/${orgApp.flyAppId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ secrets }),
    });
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
