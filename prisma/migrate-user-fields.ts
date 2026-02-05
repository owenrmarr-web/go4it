import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  const columns = [
    { name: "companyName", type: "TEXT" },
    { name: "state", type: "TEXT" },
    { name: "country", type: "TEXT" },
    { name: "useCases", type: "TEXT" },
    { name: "logo", type: "TEXT" },
    { name: "themeColors", type: "TEXT" },
  ];

  for (const col of columns) {
    try {
      await client.execute(
        `ALTER TABLE User ADD COLUMN ${col.name} ${col.type}`
      );
      console.log(`Added column: ${col.name}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("duplicate column")) {
        console.log(`Column ${col.name} already exists, skipping.`);
      } else {
        console.error(`Error adding ${col.name}:`, message);
      }
    }
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
