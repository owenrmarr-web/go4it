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
      name: "Sarah Chen",
      password,
      role: "admin",
    },
  });

  // Additional staff users
  const staffPassword = await hash("password123", 12);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "marcus.j@brightsideagency.com" },
      update: {},
      create: {
        email: "marcus.j@brightsideagency.com",
        name: "Marcus Johnson",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "emily.r@brightsideagency.com" },
      update: {},
      create: {
        email: "emily.r@brightsideagency.com",
        name: "Emily Rodriguez",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "james.w@brightsideagency.com" },
      update: {},
      create: {
        email: "james.w@brightsideagency.com",
        name: "James Wilson",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "priya.p@brightsideagency.com" },
      update: {},
      create: {
        email: "priya.p@brightsideagency.com",
        name: "Priya Patel",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "david.k@brightsideagency.com" },
      update: {},
      create: {
        email: "david.k@brightsideagency.com",
        name: "David Kim",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "olivia.t@brightsideagency.com" },
      update: {},
      create: {
        email: "olivia.t@brightsideagency.com",
        name: "Olivia Thompson",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "alex.m@brightsideagency.com" },
      update: {},
      create: {
        email: "alex.m@brightsideagency.com",
        name: "Alex Martinez",
        password: staffPassword,
        role: "member",
      },
    }),
    prisma.user.upsert({
      where: { email: "nina.s@brightsideagency.com" },
      update: {},
      create: {
        email: "nina.s@brightsideagency.com",
        name: "Nina Sharma",
        password: staffPassword,
        role: "member",
      },
    }),
  ]);

  const [marcus, emily, james, priya, david, olivia, alex, nina] = users;
  const uid = admin.id;

  // Departments
  const creative = await prisma.department.create({
    data: {
      name: "Creative",
      description: "Design, copywriting, and creative direction",
      headId: marcus.id,
      color: "#8b5cf6",
      userId: uid,
    },
  });

  const accounts = await prisma.department.create({
    data: {
      name: "Accounts",
      description: "Client relationships and account management",
      headId: emily.id,
      color: "#3b82f6",
      userId: uid,
    },
  });

  const operations = await prisma.department.create({
    data: {
      name: "Operations",
      description: "Office management, HR, and administration",
      headId: admin.id,
      color: "#10b981",
      userId: uid,
    },
  });

  const executive = await prisma.department.create({
    data: {
      name: "Executive",
      description: "Leadership and strategic direction",
      headId: admin.id,
      color: "#f59e0b",
      userId: uid,
    },
  });

  // Employee Profiles
  const now = new Date();
  const threeYearsAgo = new Date(now.getFullYear() - 3, 1, 15);
  const twoYearsAgo = new Date(now.getFullYear() - 2, 5, 1);
  const eighteenMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() - 6, 10);
  const oneYearAgo = new Date(now.getFullYear() - 1, 2, 20);
  const nineMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() + 3, 5);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 12);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 15);

  const profiles = await Promise.all([
    // Sarah Chen - CEO
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-001",
        hireDate: threeYearsAgo,
        jobTitle: "CEO & Founder",
        employmentType: "FULL_TIME",
        departmentId: executive.id,
        phone: "(555) 100-0001",
        emergencyContact: "Michael Chen - (555) 200-0001",
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
        salary: 95000,
        hourlyRate: 45.67,
        status: "ACTIVE",
        staffUserId: admin.id,
        userId: uid,
      },
    }),
    // Marcus Johnson - Creative Director
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-002",
        hireDate: twoYearsAgo,
        jobTitle: "Creative Director",
        employmentType: "FULL_TIME",
        departmentId: creative.id,
        managerId: admin.id,
        phone: "(555) 100-0002",
        emergencyContact: "Lisa Johnson - (555) 200-0002",
        address: "456 Oak Ave",
        city: "Austin",
        state: "TX",
        zip: "78702",
        salary: 85000,
        hourlyRate: 40.87,
        status: "ACTIVE",
        staffUserId: marcus.id,
        userId: uid,
      },
    }),
    // Emily Rodriguez - Account Manager
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-003",
        hireDate: eighteenMonthsAgo,
        jobTitle: "Senior Account Manager",
        employmentType: "FULL_TIME",
        departmentId: accounts.id,
        managerId: admin.id,
        phone: "(555) 100-0003",
        emergencyContact: "Carlos Rodriguez - (555) 200-0003",
        address: "789 Elm St",
        city: "Austin",
        state: "TX",
        zip: "78703",
        salary: 72000,
        hourlyRate: 34.62,
        status: "ACTIVE",
        staffUserId: emily.id,
        userId: uid,
      },
    }),
    // James Wilson - Graphic Designer
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-004",
        hireDate: oneYearAgo,
        jobTitle: "Graphic Designer",
        employmentType: "FULL_TIME",
        departmentId: creative.id,
        managerId: marcus.id,
        phone: "(555) 100-0004",
        emergencyContact: "Karen Wilson - (555) 200-0004",
        address: "321 Pine Rd",
        city: "Austin",
        state: "TX",
        zip: "78704",
        salary: 62000,
        hourlyRate: 29.81,
        status: "ACTIVE",
        staffUserId: james.id,
        userId: uid,
      },
    }),
    // Priya Patel - Copywriter
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-005",
        hireDate: nineMonthsAgo,
        jobTitle: "Copywriter",
        employmentType: "FULL_TIME",
        departmentId: creative.id,
        managerId: marcus.id,
        phone: "(555) 100-0005",
        emergencyContact: "Raj Patel - (555) 200-0005",
        address: "654 Maple Dr",
        city: "Round Rock",
        state: "TX",
        zip: "78664",
        salary: 58000,
        hourlyRate: 27.88,
        status: "ON_LEAVE",
        staffUserId: priya.id,
        userId: uid,
      },
    }),
    // David Kim - Office Manager
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-006",
        hireDate: sixMonthsAgo,
        jobTitle: "Office Manager",
        employmentType: "FULL_TIME",
        departmentId: operations.id,
        managerId: admin.id,
        phone: "(555) 100-0006",
        emergencyContact: "Susan Kim - (555) 200-0006",
        address: "987 Cedar Ln",
        city: "Austin",
        state: "TX",
        zip: "78705",
        salary: 52000,
        hourlyRate: 25.0,
        status: "ACTIVE",
        staffUserId: david.id,
        userId: uid,
      },
    }),
    // Olivia Thompson - Part-time Social Media
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-007",
        hireDate: threeMonthsAgo,
        jobTitle: "Social Media Coordinator",
        employmentType: "PART_TIME",
        departmentId: creative.id,
        managerId: marcus.id,
        phone: "(555) 100-0007",
        emergencyContact: "Tom Thompson - (555) 200-0007",
        hourlyRate: 22.0,
        salary: 38000,
        status: "ACTIVE",
        staffUserId: olivia.id,
        userId: uid,
      },
    }),
    // Alex Martinez - Contract Designer
    prisma.employeeProfile.create({
      data: {
        employeeId: "EMP-008",
        hireDate: oneMonthAgo,
        jobTitle: "UX Design Intern",
        employmentType: "INTERN",
        departmentId: creative.id,
        managerId: marcus.id,
        phone: "(555) 100-0008",
        hourlyRate: 18.0,
        status: "ACTIVE",
        staffUserId: alex.id,
        userId: uid,
      },
    }),
  ]);

  const [
    sarahProfile,
    marcusProfile,
    emilyProfile,
    jamesProfile,
    priyaProfile,
    davidProfile,
    oliviaProfile,
    alexProfile,
  ] = profiles;

  // Time-Off Requests
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const nextWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 11);
  const inTwoWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
  const inTwoWeeksEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 16);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 14);
  const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 5);
  const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 2, 5);
  const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 3, 20);
  const threeMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 3, 22);

  await Promise.all([
    // 2 PENDING
    prisma.timeOffRequest.create({
      data: {
        type: "VACATION",
        startDate: nextWeek,
        endDate: nextWeekEnd,
        totalDays: 5,
        reason: "Family vacation to Colorado",
        status: "PENDING",
        profileId: jamesProfile.id,
        userId: uid,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        type: "PERSONAL",
        startDate: inTwoWeeks,
        endDate: inTwoWeeksEnd,
        totalDays: 3,
        reason: "Moving to a new apartment",
        status: "PENDING",
        profileId: emilyProfile.id,
        userId: uid,
      },
    }),
    // 3 APPROVED
    prisma.timeOffRequest.create({
      data: {
        type: "VACATION",
        startDate: lastMonth,
        endDate: lastMonthEnd,
        totalDays: 5,
        reason: "Spring break trip",
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(lastMonth.getTime() - 7 * 24 * 60 * 60 * 1000),
        profileId: marcusProfile.id,
        userId: uid,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        type: "SICK",
        startDate: twoMonthsAgoDate,
        endDate: twoMonthsAgoEnd,
        totalDays: 1,
        reason: "Not feeling well",
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: twoMonthsAgoDate,
        profileId: davidProfile.id,
        userId: uid,
      },
    }),
    prisma.timeOffRequest.create({
      data: {
        type: "BEREAVEMENT",
        startDate: threeMonthsAgoDate,
        endDate: threeMonthsAgoEnd,
        totalDays: 3,
        reason: "Family bereavement",
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: threeMonthsAgoDate,
        profileId: oliviaProfile.id,
        userId: uid,
      },
    }),
    // 1 DENIED
    prisma.timeOffRequest.create({
      data: {
        type: "VACATION",
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
        totalDays: 7,
        reason: "Extended vacation",
        status: "DENIED",
        reviewedById: admin.id,
        reviewedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        reviewNotes: "Too close to project deadline. Please reschedule to next month.",
        profileId: jamesProfile.id,
        userId: uid,
      },
    }),
  ]);

  // Time Entries - last 2 weeks for 4 employees
  const timeEntryData = [];
  const employeesForEntries = [marcusProfile, emilyProfile, jamesProfile, davidProfile];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const entryDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    const dayOfWeek = entryDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    for (const profile of employeesForEntries) {
      const clockInHour = 8 + Math.floor(Math.random() * 2);
      const clockInMin = Math.floor(Math.random() * 30);
      const clockIn = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), clockInHour, clockInMin);
      const hoursWorked = 7.5 + Math.random() * 1.5;
      const breakMins = 30 + Math.floor(Math.random() * 3) * 15;
      const clockOut = new Date(clockIn.getTime() + (hoursWorked + breakMins / 60) * 60 * 60 * 1000);

      timeEntryData.push({
        date: entryDate,
        clockIn,
        clockOut: dayOffset === 0 && profile === marcusProfile ? null : clockOut,
        breakMinutes: breakMins,
        totalHours: dayOffset === 0 && profile === marcusProfile ? null : parseFloat(hoursWorked.toFixed(2)),
        status: dayOffset > 7 ? "APPROVED" : "PENDING",
        profileId: profile.id,
        userId: uid,
      });
    }
  }

  for (const entry of timeEntryData) {
    await prisma.timeEntry.create({ data: entry });
  }

  // Documents
  await Promise.all([
    // Company-wide documents
    prisma.document.create({
      data: {
        title: "Employee Handbook 2024",
        type: "POLICY",
        description: "Company policies, procedures, and employee guidelines",
        fileName: "employee-handbook-2024.pdf",
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "PTO Policy",
        type: "POLICY",
        description: "Paid time off accrual rates and request procedures",
        fileName: "pto-policy.pdf",
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "Code of Conduct",
        type: "POLICY",
        description: "Professional standards and workplace behavior expectations",
        fileName: "code-of-conduct.pdf",
        userId: uid,
      },
    }),
    // Employee-specific documents
    prisma.document.create({
      data: {
        title: "Offer Letter - Marcus Johnson",
        type: "OFFER_LETTER",
        description: "Creative Director offer letter",
        fileName: "offer-marcus-johnson.pdf",
        profileId: marcusProfile.id,
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "Offer Letter - Emily Rodriguez",
        type: "OFFER_LETTER",
        description: "Senior Account Manager offer letter",
        fileName: "offer-emily-rodriguez.pdf",
        profileId: emilyProfile.id,
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "Adobe Creative Suite Certification",
        type: "CERTIFICATION",
        description: "Adobe Certified Professional certification",
        fileName: "adobe-cert-james.pdf",
        profileId: jamesProfile.id,
        expiresAt: new Date(now.getFullYear(), now.getMonth() + 2, 15),
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "W-4 Tax Form - Alex Martinez",
        type: "TAX_FORM",
        description: "Federal tax withholding form",
        fileName: "w4-alex-martinez.pdf",
        profileId: alexProfile.id,
        userId: uid,
      },
    }),
    prisma.document.create({
      data: {
        title: "Freelance Contract - Olivia Thompson",
        type: "CONTRACT",
        description: "Part-time social media coordinator agreement",
        fileName: "contract-olivia-thompson.pdf",
        profileId: oliviaProfile.id,
        userId: uid,
      },
    }),
  ]);

  // Onboarding Checklist
  const checklist = await prisma.onboardingChecklist.create({
    data: {
      title: "New Hire Onboarding",
      description: "Standard onboarding checklist for all new employees at Brightside Marketing Agency",
      userId: uid,
    },
  });

  const checklistItems = await Promise.all([
    prisma.onboardingItem.create({
      data: { title: "Complete W-4 and I-9 tax forms", description: "Fill out federal and state tax withholding forms", order: 1, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Set up workstation and equipment", description: "Laptop, monitor, keyboard, and mouse setup with IT", order: 2, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Complete team introductions", description: "Meet with each department head and team members", order: 3, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Review employee handbook", description: "Read through the company employee handbook and sign acknowledgment", order: 4, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Set up email and software accounts", description: "Google Workspace, Slack, Figma, and project management tools", order: 5, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Complete security training", description: "Online security awareness and data protection training module", order: 6, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Schedule 30-day check-in with manager", description: "Set up a recurring 1:1 with your direct manager", order: 7, checklistId: checklist.id, userId: uid },
    }),
    prisma.onboardingItem.create({
      data: { title: "Complete benefits enrollment", description: "Health insurance, 401k, and other benefits selection", order: 8, checklistId: checklist.id, userId: uid },
    }),
  ]);

  // Onboarding Assignment for newest employee (Alex Martinez)
  const assignment = await prisma.onboardingAssignment.create({
    data: {
      checklistId: checklist.id,
      profileId: alexProfile.id,
      userId: uid,
    },
  });

  // 3 of 8 items completed
  await Promise.all([
    prisma.onboardingItemCompletion.create({
      data: {
        assignmentId: assignment.id,
        itemId: checklistItems[0].id,
        completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    prisma.onboardingItemCompletion.create({
      data: {
        assignmentId: assignment.id,
        itemId: checklistItems[1].id,
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    prisma.onboardingItemCompletion.create({
      data: {
        assignmentId: assignment.id,
        itemId: checklistItems[4].id,
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
  ]);

  // Announcements
  await Promise.all([
    prisma.announcement.create({
      data: {
        title: "Office Closed Friday for Maintenance",
        content: "The office will be closed this Friday for scheduled HVAC maintenance and deep cleaning. Please plan to work remotely. All meetings should be moved to virtual. Contact David Kim if you need to retrieve any items from the office.",
        priority: "URGENT",
        pinned: true,
        publishDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    prisma.announcement.create({
      data: {
        title: "Q1 All-Hands Meeting Next Tuesday",
        content: "Join us for our quarterly all-hands meeting next Tuesday at 2:00 PM in the main conference room. We'll review Q1 results, celebrate wins, and preview Q2 goals. Snacks will be provided!",
        priority: "IMPORTANT",
        pinned: false,
        publishDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    prisma.announcement.create({
      data: {
        title: "Welcome Alex Martinez!",
        content: "Please join us in welcoming Alex Martinez to the Creative team as our new UX Design Intern! Alex comes to us from UT Austin's design program. Stop by and say hello!",
        priority: "NORMAL",
        pinned: false,
        publishDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    prisma.announcement.create({
      data: {
        title: "Updated PTO Policy — Please Review",
        content: "We've updated our PTO policy to include two additional personal days per year. The updated policy document is available in the Documents section. Please review and acknowledge by end of month.",
        priority: "NORMAL",
        pinned: false,
        publishDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        userId: uid,
      },
    }),
    // Expired announcement
    prisma.announcement.create({
      data: {
        title: "Holiday Party RSVP",
        content: "Don't forget to RSVP for the holiday party by December 15th! Bring a plus one and a dish to share.",
        priority: "NORMAL",
        pinned: false,
        publishDate: new Date(now.getFullYear(), 11, 1),
        expiresAt: new Date(now.getFullYear(), 11, 20),
        userId: uid,
      },
    }),
  ]);

  console.log("Seeded GoHR data for Brightside Marketing Agency.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
