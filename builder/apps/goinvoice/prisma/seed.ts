import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash(process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID(), 12);
  await prisma.user.upsert({
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

  const userId = "preview";

  // ─── Clients ───────────────────────────────────────────────
  const riverside = await prisma.client.create({
    data: {
      name: "Riverside Brewery",
      email: "orders@riversidebrewery.com",
      phone: "555-100-2001",
      address: "412 River Rd",
      city: "Portland",
      state: "OR",
      zip: "97201",
      notes: "Craft brewery — seasonal packaging updates",
      userId,
    },
  });

  const oakwood = await prisma.client.create({
    data: {
      name: "Oakwood Dental",
      email: "office@oakwooddental.com",
      phone: "555-200-3002",
      address: "88 Oak Blvd Ste 4",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      notes: "Full rebrand in progress",
      userId,
    },
  });

  const sarah = await prisma.client.create({
    data: {
      name: "Sarah Mitchell Photography",
      email: "sarah@mitchellphoto.com",
      phone: "555-300-4003",
      address: "1920 Elm St",
      city: "Austin",
      state: "TX",
      zip: "73301",
      notes: "Needs brand refresh for wedding season",
      userId,
    },
  });

  const metro = await prisma.client.create({
    data: {
      name: "Metro Fitness",
      email: "marketing@metrofit.com",
      phone: "555-400-5004",
      address: "750 Main St",
      city: "Denver",
      state: "CO",
      zip: "80201",
      notes: "Monthly social media retainer",
      userId,
    },
  });

  const greenleaf = await prisma.client.create({
    data: {
      name: "Greenleaf Organics",
      email: "hello@greenleaforganics.com",
      phone: "555-500-6005",
      address: "305 Farm Ln",
      city: "Boise",
      state: "ID",
      zip: "83701",
      notes: "Organic food brand — eco-friendly design focus",
      userId,
    },
  });

  const techstart = await prisma.client.create({
    data: {
      name: "TechStart Inc.",
      email: "founders@techstartinc.com",
      phone: "555-600-7006",
      address: "1200 Innovation Dr",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      notes: "Series A startup — needs full brand identity",
      userId,
    },
  });

  console.log("Seeded 6 clients.");

  // ─── Helper: date offsets ──────────────────────────────────
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // ─── Estimates ─────────────────────────────────────────────
  // EST-001 — DRAFT
  const est1 = await prisma.estimate.create({
    data: {
      estimateNumber: "EST-001",
      clientId: techstart.id,
      status: "DRAFT",
      issueDate: daysAgo(5),
      expiresAt: daysFromNow(25),
      subtotal: 7200,
      taxRate: 0,
      taxAmount: 0,
      total: 7200,
      notes: "Complete brand identity package for TechStart launch",
      userId,
    },
  });

  await prisma.estimateItem.createMany({
    data: [
      { description: "Logo design and variations", quantity: 1, unitPrice: 2500, amount: 2500, estimateId: est1.id, userId },
      { description: "Brand guidelines document", quantity: 1, unitPrice: 1800, amount: 1800, estimateId: est1.id, userId },
      { description: "Business card and letterhead design", quantity: 1, unitPrice: 900, amount: 900, estimateId: est1.id, userId },
      { description: "Social media profile kit", quantity: 1, unitPrice: 2000, amount: 2000, estimateId: est1.id, userId },
    ],
  });

  // EST-002 — SENT
  const est2 = await prisma.estimate.create({
    data: {
      estimateNumber: "EST-002",
      clientId: greenleaf.id,
      status: "SENT",
      issueDate: daysAgo(10),
      expiresAt: daysFromNow(20),
      subtotal: 4500,
      taxRate: 0,
      taxAmount: 0,
      total: 4500,
      notes: "Packaging redesign for new product line",
      userId,
    },
  });

  await prisma.estimateItem.createMany({
    data: [
      { description: "Product packaging design (3 SKUs)", quantity: 3, unitPrice: 1200, amount: 3600, estimateId: est2.id, userId },
      { description: "Label design and print preparation", quantity: 1, unitPrice: 900, amount: 900, estimateId: est2.id, userId },
    ],
  });

  // EST-003 — ACCEPTED (will link to an invoice)
  const est3 = await prisma.estimate.create({
    data: {
      estimateNumber: "EST-003",
      clientId: riverside.id,
      status: "ACCEPTED",
      issueDate: daysAgo(45),
      expiresAt: daysAgo(15),
      subtotal: 3400,
      taxRate: 0,
      taxAmount: 0,
      total: 3400,
      notes: "Seasonal can artwork for summer IPA line",
      userId,
    },
  });

  await prisma.estimateItem.createMany({
    data: [
      { description: "Can artwork design (4 varieties)", quantity: 4, unitPrice: 650, amount: 2600, estimateId: est3.id, userId },
      { description: "Print-ready file preparation", quantity: 1, unitPrice: 800, amount: 800, estimateId: est3.id, userId },
    ],
  });

  // EST-004 — DECLINED
  const est4 = await prisma.estimate.create({
    data: {
      estimateNumber: "EST-004",
      clientId: metro.id,
      status: "DECLINED",
      issueDate: daysAgo(30),
      expiresAt: daysAgo(1),
      subtotal: 8500,
      taxRate: 0,
      taxAmount: 0,
      total: 8500,
      notes: "Full gym interior signage and environmental graphics",
      userId,
    },
  });

  await prisma.estimateItem.createMany({
    data: [
      { description: "Environmental graphics concept", quantity: 1, unitPrice: 3000, amount: 3000, estimateId: est4.id, userId },
      { description: "Wall mural design", quantity: 2, unitPrice: 1500, amount: 3000, estimateId: est4.id, userId },
      { description: "Wayfinding signage design", quantity: 1, unitPrice: 2500, amount: 2500, estimateId: est4.id, userId },
    ],
  });

  console.log("Seeded 4 estimates.");

  // ─── Invoices ──────────────────────────────────────────────

  // INV-001 — PAID (Riverside — linked to accepted estimate EST-003)
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-001",
      clientId: riverside.id,
      status: "PAID",
      issueDate: daysAgo(40),
      dueDate: daysAgo(10),
      paidDate: daysAgo(12),
      subtotal: 3400,
      taxRate: 0,
      taxAmount: 0,
      total: 3400,
      amountPaid: 3400,
      notes: "Summer IPA line can artwork",
      terms: "Net 30",
      estimateId: est3.id,
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Can artwork design (4 varieties)", quantity: 4, unitPrice: 650, amount: 2600, invoiceId: inv1.id, userId },
      { description: "Print-ready file preparation", quantity: 1, unitPrice: 800, amount: 800, invoiceId: inv1.id, userId },
    ],
  });

  // INV-002 — PAID (Oakwood Dental)
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-002",
      clientId: oakwood.id,
      status: "PAID",
      issueDate: daysAgo(50),
      dueDate: daysAgo(20),
      paidDate: daysAgo(22),
      subtotal: 5200,
      taxRate: 0,
      taxAmount: 0,
      total: 5200,
      amountPaid: 5200,
      notes: "Phase 1 rebrand — logo and stationery",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Logo redesign", quantity: 1, unitPrice: 2200, amount: 2200, invoiceId: inv2.id, userId },
      { description: "Business card design", quantity: 1, unitPrice: 500, amount: 500, invoiceId: inv2.id, userId },
      { description: "Letterhead and envelope design", quantity: 1, unitPrice: 750, amount: 750, invoiceId: inv2.id, userId },
      { description: "Brand guidelines document", quantity: 1, unitPrice: 1750, amount: 1750, invoiceId: inv2.id, userId },
    ],
  });

  // INV-003 — SENT (Sarah Mitchell Photography)
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-003",
      clientId: sarah.id,
      status: "SENT",
      issueDate: daysAgo(15),
      dueDate: daysFromNow(15),
      subtotal: 1800,
      taxRate: 0,
      taxAmount: 0,
      total: 1800,
      amountPaid: 0,
      notes: "Website mockups for new portfolio site",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Homepage mockup design", quantity: 1, unitPrice: 800, amount: 800, invoiceId: inv3.id, userId },
      { description: "Gallery page mockup", quantity: 1, unitPrice: 600, amount: 600, invoiceId: inv3.id, userId },
      { description: "Contact page mockup", quantity: 1, unitPrice: 400, amount: 400, invoiceId: inv3.id, userId },
    ],
  });

  // INV-004 — SENT (Metro Fitness)
  const inv4 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-004",
      clientId: metro.id,
      status: "SENT",
      issueDate: daysAgo(8),
      dueDate: daysFromNow(22),
      subtotal: 2400,
      taxRate: 0,
      taxAmount: 0,
      total: 2400,
      amountPaid: 0,
      notes: "February social media content package",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Social media post designs (12 posts)", quantity: 12, unitPrice: 125, amount: 1500, invoiceId: inv4.id, userId },
      { description: "Instagram story templates (6 stories)", quantity: 6, unitPrice: 150, amount: 900, invoiceId: inv4.id, userId },
    ],
  });

  // INV-005 — DRAFT (Greenleaf Organics)
  const inv5 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-005",
      clientId: greenleaf.id,
      status: "DRAFT",
      issueDate: daysAgo(2),
      dueDate: daysFromNow(28),
      subtotal: 950,
      taxRate: 0,
      taxAmount: 0,
      total: 950,
      amountPaid: 0,
      notes: "Menu board and promotional flyer design",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Menu board design", quantity: 1, unitPrice: 550, amount: 550, invoiceId: inv5.id, userId },
      { description: "Promotional flyer design", quantity: 1, unitPrice: 400, amount: 400, invoiceId: inv5.id, userId },
    ],
  });

  // INV-006 — DRAFT (TechStart Inc.)
  const inv6 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-006",
      clientId: techstart.id,
      status: "DRAFT",
      issueDate: daysAgo(1),
      dueDate: daysFromNow(29),
      subtotal: 3800,
      taxRate: 0,
      taxAmount: 0,
      total: 3800,
      amountPaid: 0,
      notes: "Pitch deck and investor materials",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Pitch deck design (20 slides)", quantity: 1, unitPrice: 2500, amount: 2500, invoiceId: inv6.id, userId },
      { description: "One-pager investor summary", quantity: 1, unitPrice: 800, amount: 800, invoiceId: inv6.id, userId },
      { description: "Executive bio sheet design", quantity: 1, unitPrice: 500, amount: 500, invoiceId: inv6.id, userId },
    ],
  });

  // INV-007 — OVERDUE (Sarah Mitchell Photography)
  const inv7 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-007",
      clientId: sarah.id,
      status: "OVERDUE",
      issueDate: daysAgo(55),
      dueDate: daysAgo(25),
      subtotal: 1200,
      taxRate: 0,
      taxAmount: 0,
      total: 1200,
      amountPaid: 0,
      notes: "Brand refresh — logo and social kit",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Logo refresh", quantity: 1, unitPrice: 700, amount: 700, invoiceId: inv7.id, userId },
      { description: "Social media profile kit", quantity: 1, unitPrice: 500, amount: 500, invoiceId: inv7.id, userId },
    ],
  });

  // INV-008 — CANCELLED (Metro Fitness)
  const inv8 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-008",
      clientId: metro.id,
      status: "CANCELLED",
      issueDate: daysAgo(35),
      dueDate: daysAgo(5),
      subtotal: 6200,
      taxRate: 0,
      taxAmount: 0,
      total: 6200,
      amountPaid: 0,
      notes: "Cancelled — client changed project scope",
      terms: "Net 30",
      userId,
    },
  });

  await prisma.invoiceItem.createMany({
    data: [
      { description: "Full gym branding package", quantity: 1, unitPrice: 3500, amount: 3500, invoiceId: inv8.id, userId },
      { description: "Window decal design", quantity: 2, unitPrice: 650, amount: 1300, invoiceId: inv8.id, userId },
      { description: "Vehicle wrap design", quantity: 1, unitPrice: 1400, amount: 1400, invoiceId: inv8.id, userId },
    ],
  });

  console.log("Seeded 8 invoices with line items.");

  // ─── Payments ──────────────────────────────────────────────

  // Payments for INV-001 (PAID — $3,400)
  await prisma.payment.create({
    data: {
      amount: 1700,
      paymentDate: daysAgo(15),
      method: "BANK_TRANSFER",
      reference: "BT-2024-0901",
      notes: "First installment",
      invoiceId: inv1.id,
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      amount: 1700,
      paymentDate: daysAgo(12),
      method: "BANK_TRANSFER",
      reference: "BT-2024-0915",
      notes: "Final installment",
      invoiceId: inv1.id,
      userId,
    },
  });

  // Payments for INV-002 (PAID — $5,200)
  await prisma.payment.create({
    data: {
      amount: 2600,
      paymentDate: daysAgo(25),
      method: "CHECK",
      reference: "CHK-4481",
      notes: "Check received by mail",
      invoiceId: inv2.id,
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      amount: 2600,
      paymentDate: daysAgo(22),
      method: "CREDIT_CARD",
      reference: "CC-8823",
      notes: "Balance paid via credit card",
      invoiceId: inv2.id,
      userId,
    },
  });

  // Additional payments (for variety)
  await prisma.payment.create({
    data: {
      amount: 500,
      paymentDate: daysAgo(3),
      method: "CREDIT_CARD",
      reference: "CC-9102",
      notes: "Partial payment on account",
      invoiceId: inv3.id,
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      amount: 800,
      paymentDate: daysAgo(7),
      method: "CHECK",
      reference: "CHK-4520",
      notes: "Deposit for social media work",
      invoiceId: inv4.id,
      userId,
    },
  });

  console.log("Seeded 6 payments.");

  // ─── Expenses ──────────────────────────────────────────────

  await prisma.expense.create({
    data: {
      description: "Adobe Creative Cloud subscription",
      amount: 89.99,
      date: daysAgo(5),
      category: "SOFTWARE",
      vendor: "Adobe Inc.",
      reference: "ADB-2024-02",
      notes: "Monthly subscription — all apps plan",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Printer ink cartridges (CMYK set)",
      amount: 124.50,
      date: daysAgo(12),
      category: "SUPPLIES",
      vendor: "Office Depot",
      reference: "OD-88412",
      notes: "Color proofing supplies",
      isReimbursable: true,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Client lunch — Riverside Brewery kickoff",
      amount: 78.30,
      date: daysAgo(38),
      category: "MEALS",
      vendor: "The Mason Jar",
      reference: null,
      notes: "Kickoff meeting for summer can artwork",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "CreativePro Conference registration",
      amount: 449.00,
      date: daysAgo(20),
      category: "TRAVEL",
      vendor: "CreativePro Events",
      reference: "CPE-REG-5512",
      notes: "2-day design conference in Portland",
      isReimbursable: true,
      isReimbursed: true,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Studio electricity bill",
      amount: 142.75,
      date: daysAgo(10),
      category: "UTILITIES",
      vendor: "Pacific Power",
      reference: "PP-FEB-2024",
      notes: "Monthly electricity",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Figma team plan",
      amount: 45.00,
      date: daysAgo(3),
      category: "SOFTWARE",
      vendor: "Figma Inc.",
      reference: "FIG-2024-02",
      notes: "Monthly collaboration tool subscription",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Premium stock photos (10-pack)",
      amount: 29.00,
      date: daysAgo(18),
      category: "SUPPLIES",
      vendor: "Shutterstock",
      reference: "SS-1029384",
      notes: "Stock images for Metro Fitness social posts",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Client dinner — Oakwood Dental rebrand review",
      amount: 112.40,
      date: daysAgo(28),
      category: "MEALS",
      vendor: "Bella Cucina",
      reference: null,
      notes: "Rebrand concept presentation dinner",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Parking — downtown client meetings",
      amount: 24.00,
      date: daysAgo(14),
      category: "TRAVEL",
      vendor: "City Parking",
      reference: "PKG-0224",
      notes: "3 hours downtown parking",
      isReimbursable: true,
      isReimbursed: false,
      userId,
    },
  });

  await prisma.expense.create({
    data: {
      description: "Pantone color guide book",
      amount: 12.50,
      date: daysAgo(45),
      category: "SUPPLIES",
      vendor: "Blick Art Materials",
      reference: "BLK-55432",
      notes: "Replacement swatch book",
      isReimbursable: false,
      isReimbursed: false,
      userId,
    },
  });

  console.log("Seeded 10 expenses.");
  console.log("Seed complete — Pinnacle Design Studio data ready.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
