import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@libsql/client";
import crypto from "crypto";

const client = createClient({
  url: "libsql://go4it-owenrmarr.aws-us-west-2.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const orgApps = await client.execute(`
    SELECT oa.id, oa.flyAppId, oa.flyUrl, oa.authSecret, oa.status, a.title, oa.organizationId
    FROM OrgApp oa
    JOIN App a ON a.id = oa.appId
    WHERE oa.status = 'RUNNING' AND oa.flyUrl IS NOT NULL
  `);

  console.log("Found orgApps:", orgApps.rows.map(r => ({ id: r.id, title: r.title, flyUrl: r.flyUrl })));

  for (const oa of orgApps.rows) {
    if (!oa.flyUrl || !oa.authSecret) {
      console.log(`Skipping ${oa.title} — missing flyUrl or authSecret`);
      continue;
    }

    const members = await client.execute({
      sql: `SELECT u.id, u.name, u.email, u.password, u.username, u.image, u.profileColor, u.profileEmoji, om.title as memberTitle
            FROM OrganizationMember om JOIN User u ON u.id = om.userId WHERE om.organizationId = ?`,
      args: [oa.organizationId as string],
    });

    const appMembers = await client.execute({
      sql: `SELECT userId FROM OrgAppMember WHERE orgAppId = ?`,
      args: [oa.id as string],
    });
    const assignedIds = new Set(appMembers.rows.map(r => r.userId));

    const teamMembers = members.rows
      .filter(m => m.email)
      .map(m => ({
        name: (m.name as string) || (m.email as string),
        email: m.email as string,
        assigned: assignedIds.has(m.id),
        ...(m.password && assignedIds.has(m.id) ? { passwordHash: m.password } : {}),
        username: m.username || null,
        title: m.memberTitle || null,
        image: m.image || null,
        profileColor: m.profileColor || null,
        profileEmoji: m.profileEmoji || null,
      }));

    console.log(`\n${oa.title}: syncing ${teamMembers.length} members`);

    const payload = JSON.stringify({ members: teamMembers });
    const signature = crypto
      .createHmac("sha256", oa.authSecret as string)
      .update(payload)
      .digest("hex");

    const res = await fetch(`${oa.flyUrl}/api/team-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-go4it-signature": signature,
      },
      body: payload,
      signal: AbortSignal.timeout(15000),
    });

    console.log(`${oa.title} response (${res.status}):`, await res.text());
  }
}

main().catch(console.error);
