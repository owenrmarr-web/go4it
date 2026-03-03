import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash(
    process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(),
    12
  );

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "GO4IT Admin",
      password,
      role: "admin",
    },
  });
  console.log("Seeded admin user.");

  const userId = admin.id;

  // Companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "Green Valley Landscaping",
        industry: "Landscaping",
        website: "https://greenvalleylandscaping.com",
        phone: "(555) 234-5678",
        address: "450 Oak Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
        userId,
      },
    }),
    prisma.company.create({
      data: {
        name: "Sweet Crumb Bakery",
        industry: "Food & Beverage",
        website: "https://sweetcrubnbakery.com",
        phone: "(555) 345-6789",
        address: "12 Main Street",
        city: "Portland",
        state: "OR",
        zip: "97201",
        userId,
      },
    }),
    prisma.company.create({
      data: {
        name: "Pinnacle Consulting Group",
        industry: "Consulting",
        website: "https://pinnacleconsulting.com",
        phone: "(555) 456-7890",
        address: "800 Tower Blvd, Suite 200",
        city: "Denver",
        state: "CO",
        zip: "80202",
        userId,
      },
    }),
    prisma.company.create({
      data: {
        name: "Apex Auto Repair",
        industry: "Automotive",
        website: "https://apexautorepair.com",
        phone: "(555) 567-8901",
        address: "2200 Industrial Way",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        userId,
      },
    }),
  ]);
  console.log(`Seeded ${companies.length} companies.`);

  // Contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria@greenvalleylandscaping.com",
        phone: "(555) 234-5601",
        jobTitle: "Owner",
        stage: "CUSTOMER",
        source: "REFERRAL",
        companyId: companies[0].id,
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "James",
        lastName: "Chen",
        email: "james@sweetcrunbbakery.com",
        phone: "(555) 345-6701",
        mobilePhone: "(555) 345-6702",
        jobTitle: "Head Baker & Co-Owner",
        stage: "CUSTOMER",
        source: "WALK_IN",
        companyId: companies[1].id,
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Sarah",
        lastName: "Mitchell",
        email: "sarah.mitchell@pinnacleconsulting.com",
        phone: "(555) 456-7801",
        jobTitle: "Managing Partner",
        stage: "PROSPECT",
        source: "EVENT",
        companyId: companies[2].id,
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "David",
        lastName: "Rodriguez",
        email: "david@apexautorepair.com",
        phone: "(555) 567-8902",
        mobilePhone: "(555) 567-8903",
        jobTitle: "Service Manager",
        stage: "LEAD",
        source: "WEBSITE",
        companyId: companies[3].id,
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Emily",
        lastName: "Thompson",
        email: "emily.thompson@gmail.com",
        phone: "(555) 678-9012",
        stage: "PROSPECT",
        source: "SOCIAL_MEDIA",
        city: "Seattle",
        state: "WA",
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Michael",
        lastName: "Park",
        email: "mpark@outlook.com",
        mobilePhone: "(555) 789-0123",
        stage: "LEAD",
        source: "COLD_OUTREACH",
        city: "Chicago",
        state: "IL",
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Rachel",
        lastName: "Foster",
        email: "rachel.foster@pinnacleconsulting.com",
        phone: "(555) 456-7802",
        jobTitle: "Senior Consultant",
        stage: "CUSTOMER",
        source: "REFERRAL",
        companyId: companies[2].id,
        userId,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Tom",
        lastName: "Williams",
        email: "tom.w@greenvalleylandscaping.com",
        phone: "(555) 234-5602",
        jobTitle: "Operations Manager",
        stage: "INACTIVE",
        source: "REFERRAL",
        companyId: companies[0].id,
        userId,
      },
    }),
  ]);
  console.log(`Seeded ${contacts.length} contacts.`);

  // Tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: { name: "VIP", color: "#9333ea", userId },
    }),
    prisma.tag.create({
      data: { name: "Referral", color: "#f97316", userId },
    }),
    prisma.tag.create({
      data: { name: "New Lead", color: "#22c55e", userId },
    }),
    prisma.tag.create({
      data: { name: "Follow Up", color: "#3b82f6", userId },
    }),
    prisma.tag.create({
      data: { name: "High Priority", color: "#ef4444", userId },
    }),
    prisma.tag.create({
      data: { name: "Inactive", color: "#6b7280", userId },
    }),
  ]);
  console.log(`Seeded ${tags.length} tags.`);

  // ContactTag associations
  await prisma.contactTag.createMany({
    data: [
      { contactId: contacts[0].id, tagId: tags[0].id }, // Maria - VIP
      { contactId: contacts[0].id, tagId: tags[1].id }, // Maria - Referral
      { contactId: contacts[1].id, tagId: tags[0].id }, // James - VIP
      { contactId: contacts[2].id, tagId: tags[3].id }, // Sarah - Follow Up
      { contactId: contacts[3].id, tagId: tags[2].id }, // David - New Lead
      { contactId: contacts[4].id, tagId: tags[4].id }, // Emily - High Priority
      { contactId: contacts[5].id, tagId: tags[2].id }, // Michael - New Lead
      { contactId: contacts[6].id, tagId: tags[1].id }, // Rachel - Referral
      { contactId: contacts[7].id, tagId: tags[5].id }, // Tom - Inactive
    ],
  });
  console.log("Seeded contact-tag associations.");

  // Deals
  const now = new Date();
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: "Annual Landscaping Contract",
        value: 12000,
        stage: "COMMITTED",
        expectedCloseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        contactId: contacts[0].id,
        companyId: companies[0].id,
        userId,
      },
    }),
    prisma.deal.create({
      data: {
        title: "Bakery Equipment Upgrade",
        value: 8500,
        stage: "WON",
        expectedCloseDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        closedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        contactId: contacts[1].id,
        companyId: companies[1].id,
        userId,
      },
    }),
    prisma.deal.create({
      data: {
        title: "Consulting Engagement - Q2",
        value: 25000,
        stage: "QUOTED",
        expectedCloseDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        contactId: contacts[2].id,
        companyId: companies[2].id,
        userId,
      },
    }),
    prisma.deal.create({
      data: {
        title: "Fleet Maintenance Package",
        value: 4500,
        stage: "INTERESTED",
        expectedCloseDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        contactId: contacts[3].id,
        companyId: companies[3].id,
        userId,
      },
    }),
    prisma.deal.create({
      data: {
        title: "Website Redesign Project",
        value: 6000,
        stage: "INTERESTED",
        expectedCloseDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        contactId: contacts[4].id,
        userId,
      },
    }),
    prisma.deal.create({
      data: {
        title: "Office Renovation Bid",
        value: 15000,
        stage: "LOST",
        expectedCloseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        closedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        notes: "Went with a competitor on pricing",
        contactId: contacts[2].id,
        companyId: companies[2].id,
        userId,
      },
    }),
  ]);
  console.log(`Seeded ${deals.length} deals.`);

  // Activities
  const activities = [
    {
      type: "CALL",
      subject: "Initial discovery call",
      description: "Discussed landscaping needs for commercial property. Interested in annual contract.",
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      duration: 25,
      contactId: contacts[0].id,
      userId,
    },
    {
      type: "EMAIL",
      subject: "Sent proposal for annual contract",
      description: "Emailed detailed proposal with pricing tiers for landscaping services.",
      date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      contactId: contacts[0].id,
      dealId: deals[0].id,
      userId,
    },
    {
      type: "MEETING",
      subject: "Contract review meeting",
      description: "Met at their office to review contract terms. They want to move forward.",
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      duration: 45,
      contactId: contacts[0].id,
      dealId: deals[0].id,
      userId,
    },
    {
      type: "NOTE",
      subject: "Equipment preferences noted",
      description: "James prefers Hobart mixers. Budget around $8-9K for the upgrade.",
      date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      contactId: contacts[1].id,
      dealId: deals[1].id,
      userId,
    },
    {
      type: "CALL",
      subject: "Follow-up on equipment order",
      description: "Confirmed the order has been placed. Delivery expected in 2 weeks.",
      date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      duration: 10,
      contactId: contacts[1].id,
      dealId: deals[1].id,
      userId,
    },
    {
      type: "MEETING",
      subject: "Networking event introduction",
      description: "Met Sarah at the Denver Business Leaders Summit. She's interested in our consulting services.",
      date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      duration: 15,
      contactId: contacts[2].id,
      userId,
    },
    {
      type: "EMAIL",
      subject: "Sent capabilities overview",
      description: "Sent our company overview and case studies from similar consulting engagements.",
      date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      contactId: contacts[2].id,
      dealId: deals[2].id,
      userId,
    },
    {
      type: "CALL",
      subject: "Quote discussion",
      description: "Walked through the Q2 consulting proposal. Sarah will present to her partners next week.",
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      duration: 30,
      contactId: contacts[2].id,
      dealId: deals[2].id,
      userId,
    },
    {
      type: "EMAIL",
      subject: "Website inquiry response",
      description: "David submitted a form on our website asking about fleet maintenance. Sent info packet.",
      date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      contactId: contacts[3].id,
      userId,
    },
    {
      type: "NOTE",
      subject: "Social media connection",
      description: "Emily commented on our LinkedIn post about web design. Looks like a good prospect.",
      date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      contactId: contacts[4].id,
      userId,
    },
    {
      type: "CALL",
      subject: "Cold outreach call",
      description: "Left voicemail about our services. Will follow up next week.",
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      duration: 5,
      contactId: contacts[5].id,
      userId,
    },
    {
      type: "MEETING",
      subject: "Quarterly business review",
      description: "Reviewed current engagement progress. Rachel is happy with results so far.",
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      duration: 60,
      contactId: contacts[6].id,
      userId,
    },
    {
      type: "EMAIL",
      subject: "Re-engagement email",
      description: "Sent a check-in email to Tom who we haven't heard from in a while.",
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      contactId: contacts[7].id,
      userId,
    },
    {
      type: "CALL",
      subject: "Quick check-in",
      description: "Called Maria to confirm contract start date. Everything on track.",
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      duration: 8,
      contactId: contacts[0].id,
      dealId: deals[0].id,
      userId,
    },
    {
      type: "NOTE",
      subject: "Competitor intel",
      description: "Heard from Sarah that they also received a bid from Meridian Consulting at $22K.",
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      contactId: contacts[2].id,
      dealId: deals[2].id,
      userId,
    },
  ];
  await prisma.activity.createMany({ data: activities });
  console.log(`Seeded ${activities.length} activities.`);

  // Tasks
  const today = new Date();
  today.setHours(17, 0, 0, 0);
  const tasks = [
    {
      title: "Send final contract to Maria",
      description: "Prepare and send the annual landscaping contract for signature.",
      dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // overdue
      priority: "HIGH",
      contactId: contacts[0].id,
      dealId: deals[0].id,
      userId,
    },
    {
      title: "Follow up with David on fleet quote",
      dueDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // overdue
      priority: "MEDIUM",
      contactId: contacts[3].id,
      dealId: deals[3].id,
      userId,
    },
    {
      title: "Call Sarah about consulting proposal",
      description: "Check if she's presented the Q2 proposal to her partners yet.",
      dueDate: today, // due today
      priority: "HIGH",
      contactId: contacts[2].id,
      dealId: deals[2].id,
      userId,
    },
    {
      title: "Send Emily project examples",
      description: "Share portfolio of recent website redesign projects.",
      dueDate: today, // due today
      priority: "MEDIUM",
      contactId: contacts[4].id,
      dealId: deals[4].id,
      userId,
    },
    {
      title: "Schedule call with Michael",
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // upcoming
      priority: "LOW",
      contactId: contacts[5].id,
      userId,
    },
    {
      title: "Prepare quarterly report for Rachel",
      dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // upcoming
      priority: "MEDIUM",
      contactId: contacts[6].id,
      userId,
    },
    {
      title: "Confirm bakery equipment delivery",
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      priority: "HIGH",
      completed: true,
      completedAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      contactId: contacts[1].id,
      dealId: deals[1].id,
      userId,
    },
    {
      title: "Update CRM notes from networking event",
      dueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      priority: "LOW",
      completed: true,
      completedAt: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000),
      userId,
    },
  ];
  await prisma.task.createMany({ data: tasks });
  console.log(`Seeded ${tasks.length} tasks.`);

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
