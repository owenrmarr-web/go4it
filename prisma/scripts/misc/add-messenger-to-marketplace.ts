import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { randomBytes } from "crypto";

dotenv.config();

function cuid(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const generationId = "cmlcuvpvu0002d0zo5dr2kpqc";
  const appId = cuid();

  console.log("Creating App record...");
  await client.execute({
    sql: `INSERT INTO "App" ("id", "title", "description", "category", "icon", "author", "tags", "isPublic", "createdAt")
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
    args: [
      appId,
      "Go4it Team Messenger",
      "A team messaging tool with direct messages, named group chats, file and image sharing, and message search. Messages persist with conversation history.",
      "Internal Chat",
      "💬",
      "AI Generated",
      JSON.stringify(["chat", "messaging", "groups", "file-sharing"]),
    ],
  });
  console.log(`Created App: ${appId}`);

  console.log("Linking GeneratedApp to App...");
  await client.execute({
    sql: `UPDATE "GeneratedApp" SET "appId" = ? WHERE "id" = ?`,
    args: [appId, generationId],
  });
  console.log(`Linked GeneratedApp ${generationId} → App ${appId}`);

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
