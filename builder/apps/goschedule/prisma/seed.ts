import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("go4it2026", 12);
  const unusablePassword = await hash(crypto.randomUUID(), 12);

  // ── Admin user (required: id "preview") ──
  const admin = await prisma.user.upsert({
    where: { email: "admin@go4it.live" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "Sarah Mitchell",
      password,
      role: "admin",
      isAssigned: true,
    },
  });

  // ── Staff members ──
  const jessica = await prisma.user.create({
    data: { email: "jessica@example.com", name: "Jessica Torres", password, role: "member", isAssigned: true },
  });
  const marcus = await prisma.user.create({
    data: { email: "marcus@example.com", name: "Marcus Chen", password, role: "member", isAssigned: true },
  });
  const amelia = await prisma.user.create({
    data: { email: "amelia@example.com", name: "Amelia Patel", password, role: "member", isAssigned: true },
  });
  await prisma.user.create({
    data: { email: "derek@example.com", name: "Derek Williams", password: unusablePassword, role: "member", isAssigned: false },
  });
  await prisma.user.create({
    data: { email: "lina@example.com", name: "Lina Nguyen", password: unusablePassword, role: "member", isAssigned: false },
  });

  // ── Business Settings ──
  await prisma.businessSettings.create({
    data: {
      id: "singleton",
      businessName: "Glow Studio",
      timezone: "America/New_York",
      bookingPageTitle: "Book Your Appointment at Glow Studio",
      bookingPageColor: "#9333ea",
      welcomeMessage: "Welcome to Glow Studio! Select a service and time that works for you.",
      sendReceipts: true,
      sendReminders: true,
      reminderTiming: "24h",
      cancellationWindow: 24,
      refundRule: "full",
      rescheduleWindow: 12,
      userId: admin.id,
    },
  });

  // ── Services ──
  const haircut = await prisma.service.create({
    data: {
      name: "Haircut & Style",
      description: "Precision haircut with wash and blowout styling",
      durationMin: 45,
      price: 65,
      color: "#8b5cf6",
      sortOrder: 1,
      customFields: JSON.stringify([
        { name: "Hair Length", type: "select", options: ["Short", "Medium", "Long"], required: true },
      ]),
      userId: admin.id,
    },
  });
  const colorService = await prisma.service.create({
    data: {
      name: "Hair Color",
      description: "Full color treatment with premium products",
      durationMin: 120,
      price: 150,
      color: "#ec4899",
      sortOrder: 2,
      customFields: JSON.stringify([
        { name: "Color Type", type: "select", options: ["Single Process", "Highlights", "Balayage", "Ombre"], required: true },
      ]),
      userId: admin.id,
    },
  });
  const massage = await prisma.service.create({
    data: {
      name: "Deep Tissue Massage",
      description: "60-minute therapeutic deep tissue massage",
      durationMin: 60,
      price: 95,
      color: "#14b8a6",
      sortOrder: 3,
      userId: admin.id,
    },
  });
  const facial = await prisma.service.create({
    data: {
      name: "Classic Facial",
      description: "Cleansing, exfoliation, extraction, and hydrating mask",
      durationMin: 50,
      price: 85,
      color: "#f59e0b",
      sortOrder: 4,
      userId: admin.id,
    },
  });
  const blowout = await prisma.service.create({
    data: {
      name: "Express Blowout",
      description: "Quick wash and professional blowout styling",
      durationMin: 30,
      price: 40,
      color: "#6366f1",
      sortOrder: 5,
      userId: admin.id,
    },
  });
  const manicure = await prisma.service.create({
    data: {
      name: "Gel Manicure",
      description: "Long-lasting gel polish with cuticle care and hand massage",
      durationMin: 45,
      price: 50,
      color: "#ef4444",
      sortOrder: 6,
      userId: admin.id,
    },
  });

  // ── Providers ──
  const provSarah = await prisma.provider.create({
    data: {
      staffUserId: admin.id,
      phone: "(555) 100-0001",
      bio: "Owner & master stylist with 15 years experience",
      userId: admin.id,
    },
  });
  const provJessica = await prisma.provider.create({
    data: {
      staffUserId: jessica.id,
      phone: "(555) 100-0002",
      bio: "Color specialist certified in balayage and ombre techniques",
      userId: admin.id,
    },
  });
  const provMarcus = await prisma.provider.create({
    data: {
      staffUserId: marcus.id,
      phone: "(555) 100-0003",
      bio: "Licensed massage therapist specializing in sports and deep tissue",
      userId: admin.id,
    },
  });
  const provAmelia = await prisma.provider.create({
    data: {
      staffUserId: amelia.id,
      phone: "(555) 100-0004",
      bio: "Skincare expert with advanced facial treatment certifications",
      userId: admin.id,
    },
  });

  // ── Provider-Service assignments ──
  await prisma.providerService.createMany({
    data: [
      { providerId: provSarah.id, serviceId: haircut.id },
      { providerId: provSarah.id, serviceId: blowout.id },
      { providerId: provSarah.id, serviceId: colorService.id },
      { providerId: provJessica.id, serviceId: colorService.id },
      { providerId: provJessica.id, serviceId: haircut.id },
      { providerId: provJessica.id, serviceId: blowout.id },
      { providerId: provMarcus.id, serviceId: massage.id },
      { providerId: provAmelia.id, serviceId: facial.id },
      { providerId: provAmelia.id, serviceId: manicure.id },
    ],
  });

  // ── Provider Availability (weekly) ──
  // Sarah: Mon-Fri 9am-5pm
  for (let day = 1; day <= 5; day++) {
    await prisma.providerAvailability.create({
      data: { providerId: provSarah.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
    });
  }
  // Jessica: Tue-Sat 10am-6pm
  for (const day of [2, 3, 4, 5, 6]) {
    await prisma.providerAvailability.create({
      data: { providerId: provJessica.id, dayOfWeek: day, startTime: "10:00", endTime: "18:00" },
    });
  }
  // Marcus: Mon, Wed, Fri 8am-4pm
  for (const day of [1, 3, 5]) {
    await prisma.providerAvailability.create({
      data: { providerId: provMarcus.id, dayOfWeek: day, startTime: "08:00", endTime: "16:00" },
    });
  }
  // Amelia: Mon-Thu 9am-5pm, Sat 10am-2pm
  for (let day = 1; day <= 4; day++) {
    await prisma.providerAvailability.create({
      data: { providerId: provAmelia.id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
    });
  }
  await prisma.providerAvailability.create({
    data: { providerId: provAmelia.id, dayOfWeek: 6, startTime: "10:00", endTime: "14:00" },
  });

  // ── Provider Availability Overrides ──
  await prisma.providerAvailabilityOverride.create({
    data: {
      providerId: provSarah.id,
      date: "2026-03-02",
      isAvailable: false,
      reason: "Personal day",
    },
  });
  await prisma.providerAvailabilityOverride.create({
    data: {
      providerId: provMarcus.id,
      date: "2026-03-05",
      isAvailable: true,
      startTime: "10:00",
      endTime: "14:00",
      reason: "Short day - training in afternoon",
    },
  });

  // ── Customers ──
  const customers = await Promise.all([
    prisma.customer.create({ data: { email: "olivia.r@email.com", name: "Olivia Rodriguez", phone: "(555) 200-0001" } }),
    prisma.customer.create({ data: { email: "emma.j@email.com", name: "Emma Johnson", phone: "(555) 200-0002" } }),
    prisma.customer.create({ data: { email: "noah.w@email.com", name: "Noah Williams", phone: "(555) 200-0003" } }),
    prisma.customer.create({ data: { email: "sophia.b@email.com", name: "Sophia Brown", phone: "(555) 200-0004" } }),
    prisma.customer.create({ data: { email: "liam.d@email.com", name: "Liam Davis", phone: "(555) 200-0005" } }),
    prisma.customer.create({ data: { email: "ava.m@email.com", name: "Ava Martinez" } }),
    prisma.customer.create({ data: { email: "james.g@email.com", name: "James Garcia", phone: "(555) 200-0007" } }),
    prisma.customer.create({ data: { email: "mia.l@email.com", name: "Mia Lee", phone: "(555) 200-0008" } }),
  ]);

  // ── Appointments ──
  const now = new Date();
  const dayMs = 86400000;

  function makeDate(daysFromNow: number, hour: number, minute = 0): Date {
    const d = new Date(now.getTime() + daysFromNow * dayMs);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  function addMin(date: Date, mins: number): Date {
    return new Date(date.getTime() + mins * 60000);
  }

  const appointmentData = [
    // Past - completed
    { serviceId: haircut.id, providerId: provSarah.id, customerId: customers[0].id, start: makeDate(-7, 10), dur: 45, status: "completed", source: "online" },
    { serviceId: colorService.id, providerId: provJessica.id, customerId: customers[1].id, start: makeDate(-5, 14), dur: 120, status: "completed", source: "online" },
    { serviceId: massage.id, providerId: provMarcus.id, customerId: customers[2].id, start: makeDate(-4, 9), dur: 60, status: "completed", source: "manual" },
    { serviceId: facial.id, providerId: provAmelia.id, customerId: customers[3].id, start: makeDate(-3, 11), dur: 50, status: "completed", source: "online" },
    // Past - no show
    { serviceId: blowout.id, providerId: provSarah.id, customerId: customers[4].id, start: makeDate(-2, 15), dur: 30, status: "no_show", source: "online" },
    // Past - cancelled
    { serviceId: colorService.id, providerId: provJessica.id, customerId: customers[5].id, start: makeDate(-1, 10), dur: 120, status: "cancelled", source: "online" },
    // Today
    { serviceId: haircut.id, providerId: provSarah.id, customerId: customers[6].id, start: makeDate(0, 10), dur: 45, status: "confirmed", source: "online" },
    { serviceId: massage.id, providerId: provMarcus.id, customerId: customers[7].id, start: makeDate(0, 13), dur: 60, status: "confirmed", source: "online" },
    { serviceId: facial.id, providerId: provAmelia.id, customerId: customers[0].id, start: makeDate(0, 14), dur: 50, status: "confirmed", source: "manual" },
    // Future
    { serviceId: blowout.id, providerId: provSarah.id, customerId: customers[1].id, start: makeDate(1, 11), dur: 30, status: "confirmed", source: "online" },
    { serviceId: colorService.id, providerId: provJessica.id, customerId: customers[2].id, start: makeDate(2, 10), dur: 120, status: "confirmed", source: "online" },
    { serviceId: haircut.id, providerId: provSarah.id, customerId: customers[3].id, start: makeDate(2, 14), dur: 45, status: "confirmed", source: "online" },
    { serviceId: massage.id, providerId: provMarcus.id, customerId: customers[4].id, start: makeDate(3, 9), dur: 60, status: "confirmed", source: "online" },
    { serviceId: manicure.id, providerId: provAmelia.id, customerId: customers[5].id, start: makeDate(3, 10), dur: 45, status: "confirmed", source: "online" },
    { serviceId: facial.id, providerId: provAmelia.id, customerId: customers[6].id, start: makeDate(4, 11), dur: 50, status: "confirmed", source: "online" },
    { serviceId: colorService.id, providerId: provJessica.id, customerId: customers[7].id, start: makeDate(5, 13), dur: 120, status: "confirmed", source: "online" },
    // Rescheduled
    { serviceId: haircut.id, providerId: provSarah.id, customerId: customers[0].id, start: makeDate(6, 10), dur: 45, status: "rescheduled", source: "online" },
    { serviceId: haircut.id, providerId: provSarah.id, customerId: customers[0].id, start: makeDate(8, 10), dur: 45, status: "confirmed", source: "online" },
  ];

  for (const apt of appointmentData) {
    await prisma.appointment.create({
      data: {
        serviceId: apt.serviceId,
        providerId: apt.providerId,
        customerId: apt.customerId,
        startTime: apt.start,
        endTime: addMin(apt.start, apt.dur),
        status: apt.status,
        source: apt.source,
        userId: apt.source === "manual" ? admin.id : null,
        cancelledAt: apt.status === "cancelled" ? new Date() : null,
      },
    });
  }

  console.log("Seeded GoSchedule data:");
  console.log("  - 6 users (1 admin + 3 assigned + 2 unassigned)");
  console.log("  - Business settings (Glow Studio)");
  console.log("  - 6 services");
  console.log("  - 4 providers with availability schedules");
  console.log("  - 8 customers");
  console.log("  - 18 appointments");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
