import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log("Creating Organization tables...\n");

  // Create Organization table
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Organization (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        logo TEXT,
        themeColors TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Created Organization table");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating Organization table:", message);
  }

  // Create index on slug
  try {
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS Organization_slug_key ON Organization(slug)
    `);
    console.log("✓ Created Organization slug index");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists")) {
      console.error("Error creating Organization slug index:", message);
    }
  }

  // Create OrganizationMember table
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS OrganizationMember (
        id TEXT PRIMARY KEY NOT NULL,
        organizationId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        UNIQUE(organizationId, userId)
      )
    `);
    console.log("✓ Created OrganizationMember table");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating OrganizationMember table:", message);
  }

  // Create indexes for OrganizationMember
  try {
    await client.execute(`
      CREATE INDEX IF NOT EXISTS OrganizationMember_organizationId_idx ON OrganizationMember(organizationId)
    `);
    await client.execute(`
      CREATE INDEX IF NOT EXISTS OrganizationMember_userId_idx ON OrganizationMember(userId)
    `);
    console.log("✓ Created OrganizationMember indexes");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating OrganizationMember indexes:", message);
  }

  // Create Invitation table
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS Invitation (
        id TEXT PRIMARY KEY NOT NULL,
        organizationId TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'PENDING',
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ Created Invitation table");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating Invitation table:", message);
  }

  // Create indexes for Invitation
  try {
    await client.execute(`
      CREATE INDEX IF NOT EXISTS Invitation_email_idx ON Invitation(email)
    `);
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS Invitation_token_key ON Invitation(token)
    `);
    console.log("✓ Created Invitation indexes");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating Invitation indexes:", message);
  }

  console.log("\n✅ Migration complete.");
}

migrate().catch(console.error);
