import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

function cuid(): string {
  return "cm" + randomBytes(12).toString("base64url").slice(0, 14);
}

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const orgId = "cmlcthzxz000004lak3ttyl2q"; // Victoria's Flower Shop

  const employees = [
    { name: "Victoria Chen", email: "victoria@victoriasflowers.com", role: "ADMIN" },
    { name: "Maria Santos", email: "maria@victoriasflowers.com", role: "MEMBER" },
    { name: "Jake Thompson", email: "jake@victoriasflowers.com", role: "MEMBER" },
    { name: "Lily Park", email: "lily@victoriasflowers.com", role: "MEMBER" },
  ];

  // Dummy bcrypt hash for "Welcome123!" — just for demo
  const dummyHash = "$2a$10$dGz5K2J3Q3Q3Q3Q3Q3Q3QOvJx5K2J3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3";

  for (const emp of employees) {
    const userId = cuid();

    // Create user
    await client.execute({
      sql: `INSERT OR IGNORE INTO "User" ("id", "name", "email", "password", "createdAt")
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [userId, emp.name, emp.email, dummyHash],
    });

    // Get the actual user id (in case they already existed)
    const user = await client.execute({
      sql: `SELECT id FROM "User" WHERE email = ?`,
      args: [emp.email],
    });
    const actualUserId = user.rows[0].id as string;

    // Add as org member
    const memberId = cuid();
    await client.execute({
      sql: `INSERT OR IGNORE INTO "OrganizationMember" ("id", "organizationId", "userId", "role")
            VALUES (?, ?, ?, ?)`,
      args: [memberId, orgId, actualUserId, emp.role],
    });

    console.log(`Added ${emp.name} (${emp.email}) as ${emp.role}`);
  }

  console.log("\nDone! Victoria's Flower Shop now has a team.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
