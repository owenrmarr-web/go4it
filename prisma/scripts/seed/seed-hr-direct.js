// Direct Prisma seed for GoHR — runs ON the Fly machine via SSH
// Usage: fly ssh console -a <app> -C "node /tmp/seed.js"

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "admin@go4it.live" } });
  if (!user) { console.error("Admin user not found"); return; }
  const uid = user.id;
  console.log("User:", uid);

  // Departments
  const depts = {};
  for (const d of [
    { name: "Engineering", description: "Propulsion design, testing, and integration", color: "#3b82f6" },
    { name: "Manufacturing", description: "Thruster production and assembly", color: "#f97316" },
    { name: "Business Development", description: "Sales, contracts, and partnerships", color: "#10b981" },
    { name: "Quality & Compliance", description: "AS9100, testing standards, and flight certification", color: "#8b5cf6" },
    { name: "Operations", description: "Finance, HR, and administration", color: "#ec4899" },
  ]) {
    const dept = await prisma.department.create({ data: { ...d, userId: uid } });
    depts[d.name] = dept.id;
    console.log("Department:", d.name);
  }

  // Employee profile for admin
  const existing = await prisma.employeeProfile.findFirst({ where: { staffUserId: uid } });
  if (!existing) {
    await prisma.employeeProfile.create({
      data: {
        staffUserId: uid,
        employeeId: "SGI-2024-001",
        jobTitle: "CEO & Chief Engineer",
        hireDate: new Date("2024-01-15"),
        employmentType: "FULL_TIME",
        departmentId: depts["Engineering"],
        phone: "+1-713-555-9000",
        salary: 285000,
        userId: uid,
      },
    });
    console.log("Employee: CEO (admin)");
  }

  // Announcements
  for (const a of [
    { title: "Axiom Station Module Thruster Delivery Milestone", content: "Team — I'm thrilled to announce that Flight Unit #1 of the SGX-200 for Axiom Space has completed all qualification testing and is on track for delivery this month. This represents our first flight hardware delivery for a commercial space station. Huge thanks to the propulsion engineering team for hitting every milestone. Let's keep the momentum going for units #2-4!", priority: "HIGH", pinned: true },
    { title: "Q1 All-Hands Meeting — March 20", content: "Our quarterly all-hands is scheduled for March 20 at 2:00 PM CT in the main conference room. Remote team members can join via the usual video link.\n\nAgenda:\n- Q1 revenue and pipeline review\n- SGX-300 development update\n- New hire introductions\n- Open Q&A\n\nPlease submit questions in advance to ops@spacegods.com.", priority: "NORMAL", pinned: false },
    { title: "New Safety Protocol for Propellant Operations", content: "Effective immediately, all propellant handling operations require a pre-operation briefing using the updated SOP-400 checklist. This applies to both hydrazine and NTO operations.\n\nThe updated SOP is available in GoWiki and printed copies are posted at each test cell.\n\nQuestions? Contact the Safety team.", priority: "HIGH", pinned: false },
    { title: "Space Symposium Recap", content: "Great showing at Space Symposium last month. We made contact with 3 potential new customers and strengthened relationships with existing ones. Key takeaways:\n\n- Strong interest in SGX-300 from multiple launch providers\n- Astrobotic wants to discuss lunar lander thruster package\n- Several inquiries about our consulting services for Artemis subcontractors\n\nBD team will follow up on all leads this week.", priority: "NORMAL", pinned: false },
  ]) {
    await prisma.announcement.create({ data: { ...a, userId: uid } });
    console.log("Announcement:", a.title.slice(0, 50));
  }

  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
