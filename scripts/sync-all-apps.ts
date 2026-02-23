import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const adapter = new PrismaLibSql({
  url: "libsql://go4it-owenrmarr.aws-us-west-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all running/preview org apps
  const orgApps = await prisma.orgApp.findMany({
    where: { status: { in: ["RUNNING", "PREVIEW"] }, flyUrl: { not: null } },
    include: {
      organization: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true, name: true, email: true, password: true,
                  username: true, image: true, profileColor: true, profileEmoji: true,
                },
              },
            },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  });

  console.log(`Found ${orgApps.length} running/preview apps to sync`);

  for (const orgApp of orgApps) {
    if (!orgApp.flyUrl || !orgApp.authSecret) {
      console.log(`  SKIP ${orgApp.id} — no flyUrl or authSecret`);
      continue;
    }

    const assignedUserIds = new Set(orgApp.members.map((m) => m.user.id));

    const teamMembers = orgApp.organization.members
      .filter((m) => m.user.email)
      .map((m) => ({
        name: m.user.name || m.user.email!,
        email: m.user.email!,
        assigned: assignedUserIds.has(m.user.id),
        ...(m.user.password && assignedUserIds.has(m.user.id)
          ? { passwordHash: m.user.password }
          : {}),
        username: m.user.username || null,
        title: m.title || null,
        image: m.user.image || null,
        profileColor: m.user.profileColor || null,
        profileEmoji: m.user.profileEmoji || null,
      }));

    const assignedCount = teamMembers.filter((m) => m.assigned).length;
    const withPasswords = teamMembers.filter((m) => m.assigned && "passwordHash" in m).length;

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
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        console.log(`  OK ${orgApp.flyUrl} — ${assignedCount} assigned, ${withPasswords} with passwords`);
      } else {
        console.log(`  FAIL ${orgApp.flyUrl} — HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`  ERROR ${orgApp.flyUrl} — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
