import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const EMAIL = "owenmarr@umich.edu";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: {
      organizations: true,
      generatedApps: { select: { id: true, appId: true, title: true } },
      interactions: true,
      sessions: true,
      orgAppMembers: true,
    },
  });

  if (!user) {
    console.log(`No user found with email: ${EMAIL}`);
    return;
  }

  console.log(`Found user: ${user.name} (${user.email}), id: ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Org memberships: ${user.organizations.length}`);
  console.log(`  Generated apps: ${user.generatedApps.length}`);
  console.log(`  Interactions: ${user.interactions.length}`);
  console.log(`  Sessions: ${user.sessions.length}`);
  console.log(`  OrgAppMember records: ${user.orgAppMembers.length}`);

  // Unlink GeneratedApps from this user (set createdById to null won't work — it's required)
  // Instead, just leave them — cascade delete on User will delete GeneratedApps too.
  // But user said leave apps alone, so we need to detach them first.

  // Detach GeneratedApps from user by reassigning to admin or handling differently
  // Actually the cleanest approach: nullify the FK won't work (required field).
  // Let's check if there's an admin user we can reassign to.
  const admin = await prisma.user.findFirst({ where: { isAdmin: true, email: { not: EMAIL } } });

  if (user.generatedApps.length > 0) {
    if (admin) {
      console.log(`\n  Reassigning ${user.generatedApps.length} generated apps to admin: ${admin.email}`);
      await prisma.generatedApp.updateMany({
        where: { createdById: user.id },
        data: { createdById: admin.id },
      });
    } else {
      console.log(`\n  WARNING: No other admin found. GeneratedApps will be cascade-deleted with the user.`);
      console.log(`  Generated apps that would be deleted:`);
      for (const app of user.generatedApps) {
        console.log(`    - ${app.title ?? "untitled"} (id: ${app.id}, appId: ${app.appId ?? "unpublished"})`);
      }
      console.log(`  Aborting to be safe. Create an admin user first or handle manually.`);
      return;
    }
  }

  // Remove OrgAppMember records (user as team member on deployed apps)
  if (user.orgAppMembers.length > 0) {
    const deleted = await prisma.orgAppMember.deleteMany({ where: { userId: user.id } });
    console.log(`  Deleted ${deleted.count} OrgAppMember records`);
  }

  // Remove OrganizationMember records (but leave the Org itself intact)
  if (user.organizations.length > 0) {
    const deleted = await prisma.organizationMember.deleteMany({ where: { userId: user.id } });
    console.log(`  Deleted ${deleted.count} OrganizationMember records`);
  }

  // Now delete the user (cascades: Account, Session, UserInteraction)
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`\n  User ${EMAIL} deleted successfully.`);

  // Also clean up any verification tokens for this email
  const tokens = await prisma.verificationToken.deleteMany({ where: { identifier: EMAIL } });
  if (tokens.count > 0) {
    console.log(`  Deleted ${tokens.count} verification tokens`);
  }

  console.log(`\nDone! You can now sign up again with ${EMAIL}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
