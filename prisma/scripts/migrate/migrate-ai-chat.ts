import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const statements = [
    // Conversation table
    `CREATE TABLE IF NOT EXISTS Conversation (
      id TEXT PRIMARY KEY NOT NULL,
      organizationId TEXT NOT NULL,
      userId TEXT NOT NULL,
      title TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_conversation_org_user ON Conversation(organizationId, userId)`,

    // ChatMessage table
    `CREATE TABLE IF NOT EXISTS ChatMessage (
      id TEXT PRIMARY KEY NOT NULL,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      toolCalls TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversationId) REFERENCES Conversation(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chatmessage_conversation ON ChatMessage(conversationId)`,

    // AIUsage table
    `CREATE TABLE IF NOT EXISTS AIUsage (
      id TEXT PRIMARY KEY NOT NULL,
      organizationId TEXT NOT NULL,
      date TEXT NOT NULL,
      queryCount INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_aiusage_org_date ON AIUsage(organizationId, date)`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`OK: ${sql.slice(0, 60)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        console.log(`SKIP (already exists): ${sql.slice(0, 60)}...`);
      } else {
        throw e;
      }
    }
  }

  console.log("Migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
