import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash(process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(), 12);
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

  // Create Spaces
  const [opsSpace, safetySpace, trainingSpace, companySpace] = await Promise.all([
    prisma.space.create({
      data: { name: "Operations Manual", description: "SOPs for running trips", icon: "📋", color: "#3b82f6", order: 0, userId },
    }),
    prisma.space.create({
      data: { name: "Safety Protocols", description: "Emergency procedures, equipment checks", icon: "🛡️", color: "#ef4444", order: 1, userId },
    }),
    prisma.space.create({
      data: { name: "Training Resources", description: "New guide training materials", icon: "🎓", color: "#22c55e", order: 2, userId },
    }),
    prisma.space.create({
      data: { name: "Company Info", description: "Policies, benefits, general info", icon: "🏢", color: "#6b7280", order: 3, userId },
    }),
  ]);
  console.log("Seeded 4 spaces.");

  // Create Tags
  const [tagSafety, tagTraining, tagEquipment, tagOperations, tagPolicy, tagSeasonal] = await Promise.all([
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Safety" } }, update: {}, create: { name: "Safety", color: "#ef4444", userId } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Training" } }, update: {}, create: { name: "Training", color: "#22c55e", userId } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Equipment" } }, update: {}, create: { name: "Equipment", color: "#f59e0b", userId } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Operations" } }, update: {}, create: { name: "Operations", color: "#3b82f6", userId } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Policy" } }, update: {}, create: { name: "Policy", color: "#8b5cf6", userId } }),
    prisma.tag.upsert({ where: { userId_name: { userId, name: "Seasonal" } }, update: {}, create: { name: "Seasonal", color: "#06b6d4", userId } }),
  ]);
  console.log("Seeded 6 tags.");

  // Operations Manual Pages
  const tripPlanning = await prisma.page.create({
    data: {
      title: "Trip Planning Checklist",
      slug: "trip-planning-checklist",
      content: `# Trip Planning Checklist\n\nUse this checklist to ensure every trip is properly planned and all logistics are covered.\n\n## Pre-Trip (1 Week Before)\n- [ ] Confirm client roster and emergency contacts\n- [ ] Check weather forecast for trip dates\n- [ ] Reserve vehicles and verify maintenance status\n- [ ] Confirm guide assignments\n- [ ] Review route plan and identify hazards\n- [ ] Prepare equipment loadout\n\n## Day Before\n- [ ] Load equipment into vehicles\n- [ ] Charge all communication devices\n- [ ] Print route maps and client waivers\n- [ ] Confirm meeting point with clients\n\n## Morning Of\n- [ ] Arrive 1 hour before client meeting time\n- [ ] Final equipment check\n- [ ] Brief all guides on route and conditions\n- [ ] Welcome clients and conduct safety briefing`,
      status: "PUBLISHED",
      spaceId: opsSpace.id,
      authorId: userId,
      lastEditedById: userId,
      pinned: true,
      viewCount: 89,
      order: 0,
      userId,
    },
  });

  const vehicleMaintenance = await prisma.page.create({
    data: {
      title: "Vehicle Maintenance Schedule",
      slug: "vehicle-maintenance-schedule",
      content: `# Vehicle Maintenance Schedule\n\nAll company vehicles must follow this maintenance schedule to ensure safety and reliability.\n\n## Weekly Checks\n- Tire pressure and tread depth\n- Oil level\n- Coolant level\n- Brake fluid\n- All lights and signals\n\n## Monthly Checks\n- Battery condition\n- Windshield wipers\n- Belts and hoses\n- Suspension components\n\n## Annual Service\n- Full brake inspection\n- Transmission service\n- Complete fluid change\n- Safety certification renewal`,
      status: "PUBLISHED",
      spaceId: opsSpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 34,
      order: 1,
      userId,
    },
  });

  const clientComm = await prisma.page.create({
    data: {
      title: "Client Communication Guidelines",
      slug: "client-communication-guidelines",
      content: `# Client Communication Guidelines\n\nMaintaining professional, friendly communication is key to our reputation.\n\n## Pre-Trip Communication\n- Send welcome email within 24 hours of booking\n- Provide detailed packing list and what-to-expect guide\n- Call client 48 hours before trip to confirm details\n\n## During Trip\n- Address clients by name\n- Maintain positive, encouraging tone\n- Share interesting facts about the area\n- Check in regularly on comfort and satisfaction\n\n## Post-Trip\n- Send thank-you email within 24 hours\n- Request feedback/review\n- Share photos within 1 week\n- Follow up on any concerns raised`,
      status: "PUBLISHED",
      spaceId: opsSpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 27,
      order: 2,
      userId,
    },
  });

  const postTrip = await prisma.page.create({
    data: {
      title: "Post-Trip Report Template",
      slug: "post-trip-report-template",
      content: `# Post-Trip Report Template\n\n## Trip Details\n- Trip Name:\n- Date:\n- Lead Guide:\n- Number of Clients:\n\n## Summary\n[Brief overview of the trip]\n\n## Incidents / Near Misses\n[Document any safety incidents or near misses]\n\n## Equipment Issues\n[Note any equipment failures or concerns]\n\n## Client Feedback\n[Summary of client feedback received during the trip]\n\n## Recommendations\n[Suggestions for improvement]`,
      status: "DRAFT",
      spaceId: opsSpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 12,
      order: 3,
      userId,
    },
  });

  // Safety Protocols Pages
  const emergency = await prisma.page.create({
    data: {
      title: "Emergency Response Procedures",
      slug: "emergency-response-procedures",
      content: `# Emergency Response Procedures\n\n## Critical: Call 911 for life-threatening emergencies\n\n### Severity Levels\n\n**Level 1 - Minor** (sprains, cuts, blisters)\n- Administer first aid on site\n- Document in trip report\n- Continue trip if client comfortable\n\n**Level 2 - Moderate** (fractures, allergic reactions)\n- Stabilize patient\n- Contact base camp: (555) 123-4567\n- Arrange evacuation to nearest medical facility\n\n**Level 3 - Critical** (head injury, cardiac, drowning)\n- Call 911 immediately\n- Begin CPR/first aid as trained\n- Contact base camp\n- All guides assist with evacuation\n\n### Emergency Contacts\n- Base Camp: (555) 123-4567\n- Local Hospital: (555) 987-6543\n- Search & Rescue: (555) 456-7890\n- Company Owner: (555) 111-2222`,
      status: "PUBLISHED",
      spaceId: safetySpace.id,
      authorId: userId,
      lastEditedById: userId,
      pinned: true,
      viewCount: 76,
      order: 0,
      userId,
    },
  });

  const equipInspection = await prisma.page.create({
    data: {
      title: "Equipment Inspection Guide",
      slug: "equipment-inspection-guide",
      content: `# Equipment Inspection Guide\n\nAll equipment must be inspected before each use. Follow the specific checklists for each equipment type.\n\n## General Principles\n- Never use damaged equipment\n- Tag and remove defective items immediately\n- Record all inspections in the equipment log\n- When in doubt, replace the item\n\n## Inspection Frequency\n- Before each trip: Visual inspection\n- Monthly: Detailed inspection\n- Annually: Professional certification (where applicable)`,
      status: "PUBLISHED",
      spaceId: safetySpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 45,
      order: 1,
      userId,
    },
  });

  // Sub-pages of Equipment Inspection Guide
  await prisma.page.create({
    data: {
      title: "Kayak Checklist",
      slug: "kayak-checklist",
      content: `# Kayak Inspection Checklist\n\n## Hull\n- [ ] No cracks, dents, or punctures\n- [ ] Drain plug secure\n- [ ] Hull smooth and clean\n\n## Cockpit\n- [ ] Seat secure and adjusted\n- [ ] Foot pegs functional\n- [ ] Spray skirt attachment ring intact\n\n## Paddle\n- [ ] Blades undamaged\n- [ ] Shaft straight\n- [ ] Drip rings in place\n\n## PFD (Life Jacket)\n- [ ] All buckles functional\n- [ ] No tears in fabric\n- [ ] Whistle attached`,
      status: "PUBLISHED",
      spaceId: safetySpace.id,
      parentId: equipInspection.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 22,
      order: 0,
      userId,
    },
  });

  await prisma.page.create({
    data: {
      title: "Climbing Gear Checklist",
      slug: "climbing-gear-checklist",
      content: `# Climbing Gear Inspection Checklist\n\n## Harness\n- [ ] Webbing free of cuts, fraying, or discoloration\n- [ ] Buckles function properly\n- [ ] Tie-in points show no wear\n\n## Ropes\n- [ ] No visible core shots\n- [ ] Sheath intact throughout\n- [ ] Within service life\n\n## Carabiners\n- [ ] Gates open and close smoothly\n- [ ] Locking mechanism works\n- [ ] No sharp edges\n\n## Helmets\n- [ ] Shell undamaged\n- [ ] Chin strap functional`,
      status: "PUBLISHED",
      spaceId: safetySpace.id,
      parentId: equipInspection.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 19,
      order: 1,
      userId,
    },
  });

  await prisma.page.create({
    data: {
      title: "Weather Assessment Protocol",
      slug: "weather-assessment-protocol",
      content: `# Weather Assessment Protocol\n\n## Pre-Trip Assessment (48-24 hours before)\n- Check NOAA forecast for trip area\n- Review radar and satellite imagery\n- Check river levels / water conditions\n\n## Go/No-Go Criteria\n\n### Automatic Cancellation\n- Lightning within 10 miles\n- Sustained winds > 40 mph\n- Flash flood warnings\n- Wildfire smoke AQI > 150`,
      status: "PUBLISHED",
      spaceId: safetySpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 38,
      order: 2,
      userId,
    },
  });

  // Training Resources Pages
  await prisma.page.create({
    data: {
      title: "New Guide Orientation",
      slug: "new-guide-orientation",
      content: `# New Guide Orientation\n\nWelcome to Trailhead Adventures!\n\n## Week 1: Basics\n- Company overview and mission\n- Meet the team\n- Review all safety protocols\n\n## Week 2: Skills\n- Equipment handling and inspection\n- Navigation and route planning\n- First aid refresher\n\n## Week 3: Practice\n- Lead a mock trip with staff\n- Practice emergency scenarios\n\n## Week 4: Certification\n- Written assessment\n- Practical skills evaluation\n- Solo trip with senior guide observation`,
      status: "PUBLISHED",
      spaceId: trainingSpace.id,
      authorId: userId,
      lastEditedById: userId,
      pinned: true,
      viewCount: 56,
      order: 0,
      userId,
    },
  });

  await prisma.page.create({
    data: {
      title: "Wilderness First Aid Overview",
      slug: "wilderness-first-aid-overview",
      content: `# Wilderness First Aid Overview\n\nAll guides must maintain current WFA certification.\n\n## Key Topics\n- Patient Assessment System\n- Common Wilderness Injuries\n- Evacuation Decision Matrix\n\n## Certification Requirements\n- 16-hour WFA course minimum\n- Renewal every 2 years\n- CPR certification current`,
      status: "PUBLISHED",
      spaceId: trainingSpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 41,
      order: 1,
      userId,
    },
  });

  await prisma.page.create({
    data: {
      title: "Customer Service Best Practices",
      slug: "customer-service-best-practices",
      content: `# Customer Service Best Practices\n\nDraft - Under Review\n\n## Core Principles\n1. Safety first, always\n2. Create memorable experiences\n3. Exceed expectations\n4. Listen actively\n5. Follow up consistently`,
      status: "DRAFT",
      spaceId: trainingSpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 8,
      order: 2,
      userId,
    },
  });

  // Company Info Pages
  await prisma.page.create({
    data: {
      title: "PTO Policy",
      slug: "pto-policy",
      content: `# PTO Policy\n\n## Accrual\n- Full-time employees: 15 days/year (first 2 years), 20 days/year (3+ years)\n- Part-time employees: Pro-rated based on hours\n\n## Requesting Time Off\n1. Submit request through the HR system\n2. Minimum 2 weeks notice for 3+ day requests\n3. Manager approval required`,
      status: "PUBLISHED",
      spaceId: companySpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 31,
      order: 0,
      userId,
    },
  });

  await prisma.page.create({
    data: {
      title: "Expense Reimbursement Process",
      slug: "expense-reimbursement-process",
      content: `# Expense Reimbursement Process\n\nThis page has been archived. See updated process in the new HR system.\n\n## Legacy Process\n1. Keep all receipts\n2. Fill out expense report form\n3. Submit to manager within 30 days`,
      status: "ARCHIVED",
      spaceId: companySpace.id,
      authorId: userId,
      lastEditedById: userId,
      viewCount: 5,
      order: 1,
      userId,
    },
  });

  console.log("Seeded 14 pages.");

  // Create PageRevisions for all pages
  const pages = await prisma.page.findMany({ where: { userId } });
  const revisionNotes = [
    "Initial draft",
    "Updated safety contact numbers",
    "Added winter protocols",
    "Fixed formatting",
  ];

  for (const page of pages) {
    const numRevisions = Math.min(1 + Math.floor(Math.random() * 3), 3);
    for (let i = 0; i < numRevisions; i++) {
      await prisma.pageRevision.create({
        data: {
          content: page.content,
          changeNotes: revisionNotes[i],
          editorId: userId,
          revisionNumber: i + 1,
          pageId: page.id,
          userId,
        },
      });
    }
  }
  console.log("Seeded page revisions.");

  // Create PageTags
  const allPages = await prisma.page.findMany({ where: { userId } });
  const tagMap: Record<string, string[]> = {
    "Trip Planning Checklist": [tagOperations.id],
    "Vehicle Maintenance Schedule": [tagOperations.id, tagEquipment.id],
    "Client Communication Guidelines": [tagOperations.id],
    "Emergency Response Procedures": [tagSafety.id, tagOperations.id],
    "Equipment Inspection Guide": [tagSafety.id, tagEquipment.id],
    "Kayak Checklist": [tagEquipment.id, tagSafety.id],
    "Climbing Gear Checklist": [tagEquipment.id, tagSafety.id],
    "Weather Assessment Protocol": [tagSafety.id, tagSeasonal.id],
    "New Guide Orientation": [tagTraining.id],
    "Wilderness First Aid Overview": [tagTraining.id, tagSafety.id],
    "Customer Service Best Practices": [tagTraining.id],
    "PTO Policy": [tagPolicy.id],
    "Expense Reimbursement Process": [tagPolicy.id],
  };

  for (const page of allPages) {
    const tagIds = tagMap[page.title];
    if (tagIds) {
      for (const tagId of tagIds) {
        await prisma.pageTag.create({
          data: { pageId: page.id, tagId, userId },
        });
      }
    }
  }
  console.log("Seeded page tags.");

  console.log("Seed completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
