import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

const apps = [
  {
    title: "LeadFlow CRM",
    description:
      "Track prospects, manage pipelines, and close deals with an intuitive drag-and-drop sales board built for small teams.",
    category: "CRM / Sales",
    icon: "📊",
    author: "GO4IT Labs",
    tags: JSON.stringify(["crm", "sales", "pipeline"]),
  },
  {
    title: "TaskForge",
    description:
      "Kanban-style project management with built-in time tracking, due dates, and team collaboration features.",
    category: "Project Management",
    icon: "📋",
    author: "GO4IT Labs",
    tags: JSON.stringify(["projects", "kanban", "tasks"]),
  },
  {
    title: "InvoiceNinja Pro",
    description:
      "Generate professional invoices in seconds, accept online payments, and track what's been paid versus outstanding.",
    category: "Invoicing / Finance",
    icon: "💰",
    author: "GO4IT Labs",
    tags: JSON.stringify(["invoicing", "payments", "finance"]),
  },
  {
    title: "TeamChat",
    description:
      "Real-time messaging with channels, direct messages, and file sharing — keep your remote team connected without the noise.",
    category: "Internal Chat",
    icon: "💬",
    author: "GO4IT Labs",
    tags: JSON.stringify(["chat", "messaging", "collaboration"]),
  },
  {
    title: "PeopleHub",
    description:
      "Manage employee records, track PTO balances, and handle onboarding checklists from one clean dashboard.",
    category: "HR / People",
    icon: "👥",
    author: "GO4IT Labs",
    tags: JSON.stringify(["hr", "employees", "pto"]),
  },
  {
    title: "StockPilot",
    description:
      "Real-time inventory tracking with low-stock alerts, supplier management, and purchase order automation.",
    category: "Inventory",
    icon: "📦",
    author: "GO4IT Labs",
    tags: JSON.stringify(["inventory", "supply-chain", "stock"]),
  },
  {
    title: "BookItNow",
    description:
      "Let customers self-schedule appointments online with automatic reminders, calendar sync, and buffer time controls.",
    category: "Scheduling",
    icon: "📅",
    author: "GO4IT Labs",
    tags: JSON.stringify(["scheduling", "appointments", "calendar"]),
  },
  {
    title: "ExpenseEye",
    description:
      "Submit, approve, and reimburse business expenses with receipt scanning, category budgets, and monthly reports.",
    category: "Expense Tracking",
    icon: "🧾",
    author: "GO4IT Labs",
    tags: JSON.stringify(["expenses", "receipts", "reimbursement"]),
  },
  {
    title: "ClockIn",
    description:
      "Accurate time tracking for hourly and project-based work, with one-click start/stop timers and weekly summaries.",
    category: "Time Tracking",
    icon: "⏱️",
    author: "GO4IT Labs",
    tags: JSON.stringify(["time-tracking", "hours", "reporting"]),
  },
  {
    title: "KnowHow",
    description:
      "A searchable internal wiki for your team. Create guides, SOPs, and FAQs that everyone can find in seconds.",
    category: "Knowledge Base",
    icon: "📚",
    author: "GO4IT Labs",
    tags: JSON.stringify(["docs", "wiki", "knowledge-base"]),
  },
  {
    title: "TicketDesk",
    description:
      "Manage customer support tickets with priority queues, auto-assignment, canned responses, and satisfaction surveys.",
    category: "Customer Support",
    icon: "🎧",
    author: "GO4IT Labs",
    tags: JSON.stringify(["support", "tickets", "helpdesk"]),
  },
  {
    title: "TeamSync",
    description:
      "A shared team calendar with event color-coding, recurring events, and conflict detection for meeting-heavy teams.",
    category: "Team Calendar",
    icon: "📆",
    author: "GO4IT Labs",
    tags: JSON.stringify(["calendar", "scheduling", "team"]),
  },
  {
    title: "OnboardMagic",
    description:
      "Automate the new-hire journey with task checklists, document signing, IT setup tracking, and welcome emails.",
    category: "HR / People",
    icon: "🎯",
    author: "GO4IT Labs",
    tags: JSON.stringify(["onboarding", "hr", "new-hire"]),
  },
  {
    title: "BudgetBoss",
    description:
      "Set departmental budgets, track spend in real time, and get alerts before you blow past your monthly limits.",
    category: "Invoicing / Finance",
    icon: "📈",
    author: "GO4IT Labs",
    tags: JSON.stringify(["budget", "finance", "planning"]),
  },
  {
    title: "CampaignForge",
    description:
      "Plan, launch, and track email and social media marketing campaigns with A/B testing and open-rate analytics.",
    category: "Marketing",
    icon: "📣",
    author: "GO4IT Labs",
    tags: JSON.stringify(["marketing", "campaigns", "email"]),
  },
  {
    title: "PropertyPulse",
    description:
      "Track listings, manage tenant communications, schedule maintenance, and monitor vacancy rates for property managers.",
    category: "Real Estate",
    icon: "🏠",
    author: "GO4IT Labs",
    tags: JSON.stringify(["real-estate", "property", "tenants"]),
  },
];

async function main() {
  await prisma.app.deleteMany();
  await prisma.app.createMany({ data: apps });
  console.log(`Seeded ${apps.length} apps.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
