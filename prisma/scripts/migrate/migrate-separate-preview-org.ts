/**
 * One-time migration: separate OrgApps that share a Fly machine with the store preview.
 *
 * Before the preview/org separation, publishing with "Deploy to My Account" reused the
 * same Fly machine for both the store preview and the org instance. This script finds
 * those OrgApps and resets them so the user can redeploy to get a separate machine.
 *
 * Usage: npx tsx scripts/migrate-separate-preview-org.ts
 */
import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: "libsql://go4it-owenrmarr.aws-us-west-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all OrgApps that have a flyAppId
  const orgApps = await prisma.orgApp.findMany({
    where: { flyAppId: { not: null } },
    include: {
      app: { select: { id: true, title: true, previewFlyAppId: true } },
      organization: { select: { name: true, slug: true } },
    },
  });

  let fixed = 0;
  for (const oa of orgApps) {
    if (oa.flyAppId && oa.app.previewFlyAppId && oa.flyAppId === oa.app.previewFlyAppId) {
      console.log(
        `[FIX] OrgApp ${oa.id} (${oa.app.title} @ ${oa.organization.name}): ` +
        `flyAppId "${oa.flyAppId}" matches store preview — resetting to ADDED`
      );
      await prisma.orgApp.update({
        where: { id: oa.id },
        data: {
          status: "ADDED",
          flyAppId: null,
          flyUrl: null,
          deployedAt: null,
        },
      });
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} OrgApp(s) out of ${orgApps.length} total with flyAppId.`);
  if (fixed > 0) {
    console.log("These OrgApps can now be redeployed from the account page to get separate machines.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
