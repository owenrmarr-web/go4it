import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// --- Data pools for realistic auto-generation ---
const FIRST_NAMES = ["James", "Maria", "David", "Sarah", "Michael", "Emily", "Robert", "Lisa", "Daniel", "Anna", "Chris", "Jessica", "Tom", "Rachel", "Alex"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Lee"];
const COMPANIES = ["Acme Corp", "Globex Inc", "Initech", "Umbrella Co", "Stark Industries", "Wayne Enterprises", "Capsule Corp", "Pied Piper", "Hooli", "Dunder Mifflin"];
const WORDS = ["Annual", "Strategic", "New", "Updated", "Premium", "Standard", "Enterprise", "Basic", "Advanced", "Custom", "Priority", "Quarterly", "Monthly", "Weekly"];
const NOUNS = ["Project", "Campaign", "Initiative", "Plan", "Review", "Report", "Launch", "Update", "Assessment", "Proposal", "Contract", "Agreement", "Order", "Request"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomEmail(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".") + `@${pick(["acme", "globex", "initech", "example"])}.com`;
}

function randomPhone(): string {
  return `555-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function randomText(): string {
  return `${pick(WORDS)} ${pick(NOUNS)}`;
}

function randomParagraph(): string {
  return `${pick(WORDS)} ${pick(NOUNS).toLowerCase()} for ${pick(COMPANIES)}. ${pick(["Needs review.", "In progress.", "Ready to start.", "Follow up required.", "On track."])}`;
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomCurrency(): number {
  return Math.round((Math.random() * 50000 + 500) * 100) / 100;
}

function randomDate(): Date {
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  return new Date(sixMonthsAgo + Math.random() * (now - sixMonthsAgo));
}

function randomBool(): boolean {
  return Math.random() > 0.3;
}

// Generate a value based on field type
function generateValue(field: { name: string; type: string; options?: string[] }): unknown {
  // Use field name hints for smarter generation
  const n = field.name.toLowerCase();

  switch (field.type) {
    case "text":
      if (n.includes("name") || n === "title") return n.includes("company") || n.includes("org") ? pick(COMPANIES) : (n === "name" || n === "title") ? randomText() : randomName();
      if (n.includes("url") || n.includes("website")) return "https://example.com";
      if (n.includes("address")) return `${randomNumber(100, 9999)} ${pick(["Main", "Oak", "Elm", "Park", "Cedar"])} St`;
      if (n.includes("city")) return pick(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"]);
      if (n.includes("role") || n.includes("position")) return pick(["Manager", "Developer", "Designer", "Analyst", "Director"]);
      return randomText();
    case "email":
      return randomEmail(randomName());
    case "phone":
      return randomPhone();
    case "url":
      return "https://example.com";
    case "number":
      return randomNumber(1, 100);
    case "currency":
      return randomCurrency();
    case "date":
    case "datetime":
      return randomDate();
    case "select":
      return field.options ? pick(field.options) : "Option A";
    case "textarea":
      return randomParagraph();
    case "boolean":
      return randomBool();
    default:
      return randomText();
  }
}

async function main() {
  // 1. Create admin user
  const adminPassword = await hash("go4it2026", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      email: "admin@go4it.live",
      password: adminPassword,
      name: "GO4IT Admin",
      role: "admin",
    },
  });

  // 2. Dynamically import module configs
  let modules: { entities: { prismaModel: string; fields: { name: string; type: string; options?: string[] }[] }[] }[];
  try {
    const registry = await import("../src/modules/index.js");
    modules = registry.modules || [];
  } catch {
    console.log("No modules found, seeding admin user only.");
    return;
  }

  // 3. Seed each entity — two passes (non-relation fields first, then relations)
  const createdIds: Record<string, string[]> = {};

  for (const mod of modules) {
    for (const entity of mod.entities) {
      const modelKey = entity.prismaModel.charAt(0).toLowerCase() + entity.prismaModel.slice(1);
      const model = (prisma as unknown as Record<string, unknown>)[modelKey] as { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> } | undefined;
      if (!model) {
        console.log(`  Skipping ${entity.prismaModel} (model not found)`);
        continue;
      }

      const ids: string[] = [];
      const COUNT = 10;

      for (let i = 0; i < COUNT; i++) {
        const data: Record<string, unknown> = { userId: admin.id };

        for (const field of entity.fields) {
          if (field.type === "relation") {
            // Resolve relation: field name "contactId" → look for "Contact" records
            const relatedModel = field.name.replace(/Id$/, "");
            const relatedModelCap = relatedModel.charAt(0).toUpperCase() + relatedModel.slice(1);
            const relatedIds = createdIds[relatedModelCap];
            if (relatedIds && relatedIds.length > 0) {
              data[field.name] = pick(relatedIds);
            }
          } else {
            // Handle "name" fields specially for entities that represent people
            if (field.name === "name" && (entity.prismaModel.includes("Member") || entity.prismaModel.includes("Contact") || entity.prismaModel.includes("Employee") || entity.prismaModel.includes("Client") || entity.prismaModel.includes("Customer"))) {
              data[field.name] = randomName();
            } else {
              data[field.name] = generateValue(field);
            }
          }
        }

        try {
          const record = await model.create({ data });
          ids.push(record.id);
        } catch (err) {
          console.error(`  Error seeding ${entity.prismaModel} record ${i + 1}:`, (err as Error).message);
        }
      }

      createdIds[entity.prismaModel] = ids;
      console.log(`  Seeded ${ids.length} ${entity.prismaModel} records`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
