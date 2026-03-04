import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash(
    process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(),
    12
  );
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

  // Contact Lists
  const newsletterList = await prisma.contactList.create({
    data: {
      name: "Newsletter Subscribers",
      description: "Monthly newsletter recipients — coffee lovers and enthusiasts",
      color: "#6366f1",
      userId,
    },
  });

  const wholesaleList = await prisma.contactList.create({
    data: {
      name: "Wholesale Partners",
      description: "B2B wholesale buyers and cafe owners",
      color: "#f59e0b",
      userId,
    },
  });

  const vipList = await prisma.contactList.create({
    data: {
      name: "VIP Customers",
      description: "High-value repeat customers with loyalty perks",
      color: "#10b981",
      userId,
    },
  });

  // Subscribers — Newsletter (6)
  const newsletterSubs = [
    { email: "sarah.chen@gmail.com", name: "Sarah Chen", status: "ACTIVE" },
    { email: "mike.johnson@outlook.com", name: "Mike Johnson", status: "ACTIVE" },
    { email: "emma.davis@yahoo.com", name: "Emma Davis", status: "ACTIVE" },
    { email: "james.wilson@gmail.com", name: "James Wilson", status: "ACTIVE" },
    { email: "olivia.brown@hotmail.com", name: "Olivia Brown", status: "UNSUBSCRIBED" },
    { email: "noah.martinez@gmail.com", name: "Noah Martinez", status: "ACTIVE" },
  ];

  for (const sub of newsletterSubs) {
    await prisma.subscriber.create({
      data: {
        ...sub,
        listId: newsletterList.id,
        userId,
        unsubscribedAt: sub.status === "UNSUBSCRIBED" ? new Date("2026-02-15") : null,
      },
    });
  }

  // Subscribers — Wholesale (6)
  const wholesaleSubs = [
    { email: "tom@beancafé.com", name: "Tom Rivera", status: "ACTIVE" },
    { email: "lisa@morningbrew.co", name: "Lisa Chang", status: "ACTIVE" },
    { email: "raj@spicehouse.com", name: "Raj Patel", status: "ACTIVE" },
    { email: "karen@dailygrind.com", name: "Karen O'Brien", status: "ACTIVE" },
    { email: "alex@roastco.com", name: "Alex Thompson", status: "BOUNCED" },
    { email: "maria@cafesol.com", name: "Maria Santos", status: "ACTIVE" },
  ];

  for (const sub of wholesaleSubs) {
    await prisma.subscriber.create({
      data: {
        ...sub,
        listId: wholesaleList.id,
        userId,
      },
    });
  }

  // Subscribers — VIP (6)
  const vipSubs = [
    { email: "david.kim@gmail.com", name: "David Kim", status: "ACTIVE" },
    { email: "jennifer.lee@icloud.com", name: "Jennifer Lee", status: "ACTIVE" },
    { email: "robert.taylor@gmail.com", name: "Robert Taylor", status: "ACTIVE" },
    { email: "amanda.white@outlook.com", name: "Amanda White", status: "ACTIVE" },
    { email: "chris.garcia@yahoo.com", name: "Chris Garcia", status: "UNSUBSCRIBED" },
    { email: "nicole.anderson@gmail.com", name: "Nicole Anderson", status: "ACTIVE" },
  ];

  for (const sub of vipSubs) {
    await prisma.subscriber.create({
      data: {
        ...sub,
        listId: vipList.id,
        userId,
        unsubscribedAt: sub.status === "UNSUBSCRIBED" ? new Date("2026-02-20") : null,
      },
    });
  }

  console.log("Seeded subscribers.");

  // Templates
  const monthlyNewsletter = await prisma.template.create({
    data: {
      name: "Monthly Newsletter",
      subject: "Your Monthly Coffee Update from Coastal Coffee Roasters",
      body: "Hi there!\n\nHere's what's brewing at Coastal Coffee Roasters this month:\n\n- New single-origin beans from Ethiopia\n- Behind the scenes: Our roasting process\n- Customer spotlight: Meet our favorite regulars\n- Upcoming tasting events\n\nThanks for being part of our coffee community!\n\nWarm regards,\nThe Coastal Coffee Team",
      category: "NEWSLETTER",
      userId,
    },
  });

  const flashSale = await prisma.template.create({
    data: {
      name: "Flash Sale",
      subject: "24-Hour Flash Sale — Up to 30% Off!",
      body: "Don't miss out!\n\nFor the next 24 hours, enjoy exclusive discounts:\n\n- 30% off all single-origin beans\n- 20% off brewing equipment\n- Free shipping on orders over $50\n\nUse code FLASH30 at checkout.\n\nHurry — this deal won't last!\n\nCheers,\nCoastal Coffee Roasters",
      category: "PROMOTION",
      userId,
    },
  });

  const newProduct = await prisma.template.create({
    data: {
      name: "New Product Announcement",
      subject: "Introducing Our Latest Blend!",
      body: "We're excited to share something special!\n\nAfter months of development, we're proud to introduce our newest blend. Carefully crafted from beans sourced across three continents, this blend offers notes of dark chocolate, caramel, and a hint of citrus.\n\nAvailable now in our online store.\n\nTaste the difference,\nCoastal Coffee Roasters",
      category: "ANNOUNCEMENT",
      userId,
    },
  });

  await prisma.template.create({
    data: {
      name: "Welcome Email",
      subject: "Welcome to the Coastal Coffee Family!",
      body: "Welcome aboard!\n\nWe're thrilled to have you join the Coastal Coffee Roasters community. Here's what you can expect:\n\n- Monthly newsletters with roasting tips and new arrivals\n- Exclusive subscriber-only discounts\n- Early access to limited edition blends\n- Invitations to tasting events\n\nAs a welcome gift, enjoy 15% off your first order with code WELCOME15.\n\nHappy brewing!\nThe Coastal Coffee Team",
      category: "WELCOME",
      userId,
    },
  });

  console.log("Seeded templates.");

  // Campaigns
  const now = new Date();

  // SENT campaigns (3) with send logs
  const sent1 = await prisma.campaign.create({
    data: {
      name: "February Newsletter",
      subject: "February Coffee Update — New Arrivals Inside!",
      body: monthlyNewsletter.body,
      status: "SENT",
      listId: newsletterList.id,
      templateId: monthlyNewsletter.id,
      sentAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      recipientCount: 45,
      openCount: 32,
      clickCount: 14,
      bounceCount: 2,
      userId,
    },
  });

  const sent2 = await prisma.campaign.create({
    data: {
      name: "Valentine's Day Flash Sale",
      subject: "Love is Brewing — Valentine's Day Sale!",
      body: flashSale.body,
      status: "SENT",
      listId: vipList.id,
      templateId: flashSale.id,
      sentAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      recipientCount: 28,
      openCount: 22,
      clickCount: 11,
      bounceCount: 1,
      userId,
    },
  });

  const sent3 = await prisma.campaign.create({
    data: {
      name: "Q1 Wholesale Price Update",
      subject: "Updated Q1 Pricing & New Wholesale Options",
      body: "Dear partners,\n\nPlease find our updated Q1 pricing attached. Highlights include:\n\n- 5% volume discount on orders over 100lbs\n- New seasonal blend available for wholesale\n- Extended payment terms for partners in good standing\n\nPlease reach out to discuss your Q1 orders.\n\nBest,\nCoastal Coffee Roasters Wholesale Team",
      status: "SENT",
      listId: wholesaleList.id,
      sentAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      recipientCount: 12,
      openCount: 10,
      clickCount: 6,
      bounceCount: 1,
      userId,
    },
  });

  // DRAFT campaign
  await prisma.campaign.create({
    data: {
      name: "Spring Collection Launch",
      subject: "Spring Has Sprung — New Seasonal Blends!",
      body: newProduct.body,
      status: "DRAFT",
      listId: newsletterList.id,
      templateId: newProduct.id,
      userId,
    },
  });

  // SCHEDULED campaign
  await prisma.campaign.create({
    data: {
      name: "March Newsletter",
      subject: "March Coffee Roundup — What's New This Month",
      body: monthlyNewsletter.body,
      status: "SCHEDULED",
      listId: newsletterList.id,
      templateId: monthlyNewsletter.id,
      scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      userId,
    },
  });

  // CANCELLED campaign
  await prisma.campaign.create({
    data: {
      name: "Winter Clearance Sale",
      subject: "Winter Clearance — Last Chance!",
      body: "Final winter clearance! Everything must go before spring inventory arrives.",
      status: "CANCELLED",
      listId: vipList.id,
      userId,
    },
  });

  console.log("Seeded campaigns.");

  // SendLog entries for SENT campaigns
  const sendLogData = [
    // sent1 — February Newsletter (10 logs)
    { campaignId: sent1.id, subscriberEmail: "sarah.chen@gmail.com", subscriberName: "Sarah Chen", status: "CLICKED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 2 * 60 * 60 * 1000), clickedAt: new Date(sent1.sentAt!.getTime() + 3 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "mike.johnson@outlook.com", subscriberName: "Mike Johnson", status: "OPENED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 5 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "emma.davis@yahoo.com", subscriberName: "Emma Davis", status: "CLICKED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 1 * 60 * 60 * 1000), clickedAt: new Date(sent1.sentAt!.getTime() + 2 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "james.wilson@gmail.com", subscriberName: "James Wilson", status: "DELIVERED", sentAt: sent1.sentAt! },
    { campaignId: sent1.id, subscriberEmail: "noah.martinez@gmail.com", subscriberName: "Noah Martinez", status: "OPENED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 8 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "pat.oneill@gmail.com", subscriberName: "Pat O'Neill", status: "CLICKED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 4 * 60 * 60 * 1000), clickedAt: new Date(sent1.sentAt!.getTime() + 5 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "jenny.wu@outlook.com", subscriberName: "Jenny Wu", status: "OPENED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 12 * 60 * 60 * 1000) },
    { campaignId: sent1.id, subscriberEmail: "mark.hall@yahoo.com", subscriberName: "Mark Hall", status: "BOUNCED", sentAt: sent1.sentAt! },
    { campaignId: sent1.id, subscriberEmail: "susan.clark@gmail.com", subscriberName: "Susan Clark", status: "DELIVERED", sentAt: sent1.sentAt! },
    { campaignId: sent1.id, subscriberEmail: "brian.adams@hotmail.com", subscriberName: "Brian Adams", status: "OPENED", sentAt: sent1.sentAt!, openedAt: new Date(sent1.sentAt!.getTime() + 24 * 60 * 60 * 1000) },

    // sent2 — Valentine's Day Flash Sale (8 logs)
    { campaignId: sent2.id, subscriberEmail: "david.kim@gmail.com", subscriberName: "David Kim", status: "CLICKED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 1 * 60 * 60 * 1000), clickedAt: new Date(sent2.sentAt!.getTime() + 2 * 60 * 60 * 1000) },
    { campaignId: sent2.id, subscriberEmail: "jennifer.lee@icloud.com", subscriberName: "Jennifer Lee", status: "CLICKED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 3 * 60 * 60 * 1000), clickedAt: new Date(sent2.sentAt!.getTime() + 4 * 60 * 60 * 1000) },
    { campaignId: sent2.id, subscriberEmail: "robert.taylor@gmail.com", subscriberName: "Robert Taylor", status: "OPENED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 6 * 60 * 60 * 1000) },
    { campaignId: sent2.id, subscriberEmail: "amanda.white@outlook.com", subscriberName: "Amanda White", status: "OPENED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 2 * 60 * 60 * 1000) },
    { campaignId: sent2.id, subscriberEmail: "nicole.anderson@gmail.com", subscriberName: "Nicole Anderson", status: "CLICKED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 1 * 60 * 60 * 1000), clickedAt: new Date(sent2.sentAt!.getTime() + 1.5 * 60 * 60 * 1000) },
    { campaignId: sent2.id, subscriberEmail: "alan.brooks@gmail.com", subscriberName: "Alan Brooks", status: "DELIVERED", sentAt: sent2.sentAt! },
    { campaignId: sent2.id, subscriberEmail: "wendy.zhao@outlook.com", subscriberName: "Wendy Zhao", status: "BOUNCED", sentAt: sent2.sentAt! },
    { campaignId: sent2.id, subscriberEmail: "carlos.mendez@yahoo.com", subscriberName: "Carlos Mendez", status: "OPENED", sentAt: sent2.sentAt!, openedAt: new Date(sent2.sentAt!.getTime() + 10 * 60 * 60 * 1000) },

    // sent3 — Q1 Wholesale (8 logs)
    { campaignId: sent3.id, subscriberEmail: "tom@beancafé.com", subscriberName: "Tom Rivera", status: "CLICKED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 1 * 60 * 60 * 1000), clickedAt: new Date(sent3.sentAt!.getTime() + 2 * 60 * 60 * 1000) },
    { campaignId: sent3.id, subscriberEmail: "lisa@morningbrew.co", subscriberName: "Lisa Chang", status: "CLICKED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 2 * 60 * 60 * 1000), clickedAt: new Date(sent3.sentAt!.getTime() + 3 * 60 * 60 * 1000) },
    { campaignId: sent3.id, subscriberEmail: "raj@spicehouse.com", subscriberName: "Raj Patel", status: "OPENED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 4 * 60 * 60 * 1000) },
    { campaignId: sent3.id, subscriberEmail: "karen@dailygrind.com", subscriberName: "Karen O'Brien", status: "CLICKED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 1 * 60 * 60 * 1000), clickedAt: new Date(sent3.sentAt!.getTime() + 1.5 * 60 * 60 * 1000) },
    { campaignId: sent3.id, subscriberEmail: "alex@roastco.com", subscriberName: "Alex Thompson", status: "BOUNCED", sentAt: sent3.sentAt! },
    { campaignId: sent3.id, subscriberEmail: "maria@cafesol.com", subscriberName: "Maria Santos", status: "OPENED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 6 * 60 * 60 * 1000) },
    { campaignId: sent3.id, subscriberEmail: "frank@brewhaus.com", subscriberName: "Frank Mueller", status: "DELIVERED", sentAt: sent3.sentAt! },
    { campaignId: sent3.id, subscriberEmail: "yuki@teaandcoffee.jp", subscriberName: "Yuki Tanaka", status: "CLICKED", sentAt: sent3.sentAt!, openedAt: new Date(sent3.sentAt!.getTime() + 3 * 60 * 60 * 1000), clickedAt: new Date(sent3.sentAt!.getTime() + 4 * 60 * 60 * 1000) },
  ];

  for (const log of sendLogData) {
    await prisma.sendLog.create({
      data: {
        ...log,
        userId,
      },
    });
  }

  console.log("Seeded send logs.");
  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
