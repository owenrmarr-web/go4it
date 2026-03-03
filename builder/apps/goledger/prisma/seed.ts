import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const plainPassword = process.env.GO4IT_ADMIN_PASSWORD || crypto.randomUUID();
  const password = await hash(plainPassword, 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { id: "preview" },
    update: {},
    create: {
      id: "preview",
      email: "admin@go4it.live",
      name: "GO4IT Admin",
      password,
      role: "admin",
    },
  });
  console.log(`Seeded admin user. Login: admin@go4it.live / ${plainPassword}`);

  const userId = admin.id;
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Business Settings
  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      businessName: "Green Valley Landscaping",
      address: "1250 Elm Street",
      city: "Denver",
      state: "CO",
      zip: "80202",
      phone: "(303) 555-0147",
      email: "info@greenvalleylandscaping.com",
      website: "https://greenvalleylandscaping.com",
      taxRate: 0.07,
      defaultPaymentTerms: "NET_30",
      currency: "USD",
      invoicePrefix: "INV",
      estimatePrefix: "EST",
      nextInvoiceNumber: 1001,
      nextEstimateNumber: 1,
      paymentInstructions:
        "Payment by check:\nGreen Valley Landscaping\n1250 Elm Street, Denver, CO 80202\n\nACH / Wire Transfer:\nFirst National Bank of Colorado\nRouting: 102003154\nAccount: 4821-7390-55\n\nPlease include invoice number on all payments.",
      userId,
    },
  });
  console.log("Seeded business settings.");

  // Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Landscaping Services",
        type: "INCOME",
        color: "#22c55e",
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Maintenance",
        type: "INCOME",
        color: "#3b82f6",
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Equipment Rental",
        type: "INCOME",
        color: "#a855f7",
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Fuel & Materials",
        type: "EXPENSE",
        color: "#f97316",
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Equipment Repair",
        type: "EXPENSE",
        color: "#ef4444",
        userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Office Supplies",
        type: "EXPENSE",
        color: "#6b7280",
        userId,
      },
    }),
  ]);
  console.log(`Seeded ${categories.length} categories.`);

  const [
    catLandscaping,
    catMaintenance,
    catEquipmentRental,
    catFuelMaterials,
    catEquipmentRepair,
    catOfficeSupplies,
  ] = categories;

  // Clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: "Sunridge Property Management",
        email: "accounting@sunridgepm.com",
        phone: "(303) 555-0210",
        type: "BUSINESS",
        role: "CUSTOMER",
        contactName: "Karen Whitfield",
        address: "800 16th Street, Suite 400",
        city: "Denver",
        state: "CO",
        zip: "80202",
        paymentTerms: "NET_30",
        notes: "Manages 12 commercial properties in metro Denver area. Primary contact for all landscaping contracts.",
        userId,
      },
    }),
    prisma.client.create({
      data: {
        name: "Oakwood HOA",
        email: "board@oakwoodhoa.org",
        phone: "(303) 555-0325",
        type: "BUSINESS",
        role: "CUSTOMER",
        contactName: "Dan Mercer",
        address: "2450 Oakwood Drive",
        city: "Lakewood",
        state: "CO",
        zip: "80228",
        paymentTerms: "NET_15",
        notes: "Homeowners association with 85 units. Seasonal contracts for common area maintenance.",
        userId,
      },
    }),
    prisma.client.create({
      data: {
        name: "Martinez Family",
        email: "rosa.martinez@gmail.com",
        phone: "(720) 555-0189",
        type: "INDIVIDUAL",
        role: "CUSTOMER",
        contactName: "Rosa Martinez",
        address: "1847 Vine Street",
        city: "Denver",
        state: "CO",
        zip: "80206",
        paymentTerms: "DUE_ON_RECEIPT",
        notes: "Residential customer. Large backyard with established garden beds.",
        userId,
      },
    }),
    prisma.client.create({
      data: {
        name: "Johnson Residence",
        email: "mike.johnson@outlook.com",
        phone: "(303) 555-0472",
        type: "INDIVIDUAL",
        role: "CUSTOMER",
        contactName: "Mike Johnson",
        address: "3920 Maple Lane",
        city: "Aurora",
        state: "CO",
        zip: "80014",
        paymentTerms: "DUE_ON_RECEIPT",
        notes: "New construction home. Needs full landscaping installation.",
        userId,
      },
    }),
    prisma.client.create({
      data: {
        name: "Rocky Mountain Equipment Co.",
        email: "rentals@rmequipment.com",
        phone: "(303) 555-0598",
        type: "BUSINESS",
        role: "VENDOR",
        contactName: "Steve Briggs",
        address: "7100 Industrial Blvd",
        city: "Commerce City",
        state: "CO",
        zip: "80022",
        paymentTerms: "NET_30",
        notes: "Primary equipment supplier. Rents skid steers, trenchers, and stump grinders.",
        userId,
      },
    }),
    prisma.client.create({
      data: {
        name: "Denver Fuel Supply",
        email: "orders@denverfuel.com",
        phone: "(303) 555-0661",
        type: "BUSINESS",
        role: "VENDOR",
        contactName: "Lisa Tran",
        address: "520 Kalamath Street",
        city: "Denver",
        state: "CO",
        zip: "80204",
        paymentTerms: "NET_15",
        notes: "Bulk diesel and gasoline deliveries. Weekly deliveries on Mondays.",
        userId,
      },
    }),
  ]);
  console.log(`Seeded ${clients.length} clients.`);

  const [
    sunridge,
    oakwood,
    martinez,
    johnson,
    rockyMtnEquip,
    denverFuel,
  ] = clients;

  // Invoices
  const taxRate = 0.07;

  // Helper to create invoice with line items
  async function createInvoice(data: {
    invoiceNumber: string;
    clientId: string;
    status: string;
    issueDate: Date;
    dueDate: Date;
    paymentTerms: string;
    categoryId?: string;
    notes?: string;
    memo?: string;
    poNumber?: string;
    paidAt?: Date;
    amountPaid?: number;
    lineItems: { description: string; quantity: number; unitPrice: number; sortOrder: number }[];
  }) {
    const subtotal = data.lineItems.reduce(
      (sum, li) => sum + li.quantity * li.unitPrice,
      0
    );
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        clientId: data.clientId,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal,
        taxRate,
        taxAmount,
        total,
        amountPaid: data.amountPaid ?? 0,
        paymentTerms: data.paymentTerms,
        categoryId: data.categoryId,
        notes: data.notes,
        memo: data.memo,
        poNumber: data.poNumber,
        paidAt: data.paidAt,
        sentAt:
          data.status !== "DRAFT"
            ? new Date(data.issueDate.getTime() + day)
            : undefined,
        userId,
        lineItems: {
          create: data.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: Math.round(li.quantity * li.unitPrice * 100) / 100,
            sortOrder: li.sortOrder,
          })),
        },
      },
    });
    return invoice;
  }

  // INV-1001: PAID - Sunridge monthly maintenance (45 days ago)
  const inv1001 = await createInvoice({
    invoiceNumber: "INV-1001",
    clientId: sunridge.id,
    status: "PAID",
    issueDate: new Date(now.getTime() - 45 * day),
    dueDate: new Date(now.getTime() - 15 * day),
    paymentTerms: "NET_30",
    categoryId: catMaintenance.id,
    paidAt: new Date(now.getTime() - 20 * day),
    notes: "Monthly property maintenance - January",
    lineItems: [
      { description: "Weekly lawn maintenance (4 visits)", quantity: 4, unitPrice: 175, sortOrder: 0 },
      { description: "Parking lot leaf cleanup", quantity: 1, unitPrice: 350, sortOrder: 1 },
      { description: "Irrigation system winterization", quantity: 1, unitPrice: 425, sortOrder: 2 },
    ],
  });

  // INV-1002: PAID - Oakwood HOA fall cleanup (35 days ago)
  const inv1002 = await createInvoice({
    invoiceNumber: "INV-1002",
    clientId: oakwood.id,
    status: "PAID",
    issueDate: new Date(now.getTime() - 35 * day),
    dueDate: new Date(now.getTime() - 20 * day),
    paymentTerms: "NET_15",
    categoryId: catLandscaping.id,
    paidAt: new Date(now.getTime() - 18 * day),
    poNumber: "OAK-2026-014",
    notes: "Fall cleanup and winterization for common areas",
    lineItems: [
      { description: "Fall leaf removal - common areas (3 acres)", quantity: 1, unitPrice: 1200, sortOrder: 0 },
      { description: "Hedge trimming and shaping", quantity: 1, unitPrice: 650, sortOrder: 1 },
      { description: "Flower bed cleanup and mulching", quantity: 1, unitPrice: 480, sortOrder: 2 },
      { description: "Tree branch removal (storm damage)", quantity: 1, unitPrice: 375, sortOrder: 3 },
    ],
  });

  // INV-1003: PARTIAL - Martinez spring work (20 days ago)
  const inv1003 = await createInvoice({
    invoiceNumber: "INV-1003",
    clientId: martinez.id,
    status: "PARTIAL",
    issueDate: new Date(now.getTime() - 20 * day),
    dueDate: new Date(now.getTime() + 10 * day),
    paymentTerms: "DUE_ON_RECEIPT",
    categoryId: catLandscaping.id,
    notes: "Spring garden restoration",
    lineItems: [
      { description: "Spring cleanup and debris removal", quantity: 1, unitPrice: 275, sortOrder: 0 },
      { description: "Mulch installation - 5 cubic yards", quantity: 5, unitPrice: 85, sortOrder: 1 },
      { description: "Perennial bed division and replanting", quantity: 1, unitPrice: 350, sortOrder: 2 },
    ],
  });

  // INV-1004: SENT - Sunridge monthly maintenance (10 days ago, not yet due)
  await createInvoice({
    invoiceNumber: "INV-1004",
    clientId: sunridge.id,
    status: "SENT",
    issueDate: new Date(now.getTime() - 10 * day),
    dueDate: new Date(now.getTime() + 20 * day),
    paymentTerms: "NET_30",
    categoryId: catMaintenance.id,
    notes: "Monthly property maintenance - February",
    lineItems: [
      { description: "Weekly lawn maintenance (4 visits)", quantity: 4, unitPrice: 175, sortOrder: 0 },
      { description: "Snow removal (2 events)", quantity: 2, unitPrice: 225, sortOrder: 1 },
    ],
  });

  // INV-1005: SENT - Oakwood (overdue - due date in past)
  await createInvoice({
    invoiceNumber: "INV-1005",
    clientId: oakwood.id,
    status: "SENT",
    issueDate: new Date(now.getTime() - 25 * day),
    dueDate: new Date(now.getTime() - 10 * day),
    paymentTerms: "NET_15",
    categoryId: catMaintenance.id,
    poNumber: "OAK-2026-018",
    memo: "Payment overdue. Please remit at your earliest convenience.",
    lineItems: [
      { description: "Parking lot snow plowing (3 events)", quantity: 3, unitPrice: 300, sortOrder: 0 },
      { description: "Sidewalk de-icing and salt application", quantity: 3, unitPrice: 125, sortOrder: 1 },
    ],
  });

  // INV-1006: DRAFT - Johnson residence landscaping
  await createInvoice({
    invoiceNumber: "INV-1006",
    clientId: johnson.id,
    status: "DRAFT",
    issueDate: new Date(now.getTime() - 2 * day),
    dueDate: new Date(now.getTime() + 28 * day),
    paymentTerms: "DUE_ON_RECEIPT",
    categoryId: catLandscaping.id,
    notes: "New construction landscaping package",
    lineItems: [
      { description: "Front yard sod installation (1,200 sq ft)", quantity: 1, unitPrice: 1800, sortOrder: 0 },
      { description: "Decorative rock border installation", quantity: 1, unitPrice: 650, sortOrder: 1 },
      { description: "Drip irrigation system - front beds", quantity: 1, unitPrice: 875, sortOrder: 2 },
      { description: "3 ornamental trees (planted)", quantity: 3, unitPrice: 285, sortOrder: 3 },
    ],
  });

  // INV-1007: DRAFT - Martinez additional work
  await createInvoice({
    invoiceNumber: "INV-1007",
    clientId: martinez.id,
    status: "DRAFT",
    issueDate: now,
    dueDate: new Date(now.getTime() + 30 * day),
    paymentTerms: "DUE_ON_RECEIPT",
    categoryId: catLandscaping.id,
    lineItems: [
      { description: "Paver patio extension (120 sq ft)", quantity: 1, unitPrice: 2400, sortOrder: 0 },
      { description: "Retaining wall repair (15 linear ft)", quantity: 1, unitPrice: 1100, sortOrder: 1 },
    ],
  });

  // INV-1008: VOID - Cancelled project
  await createInvoice({
    invoiceNumber: "INV-1008",
    clientId: johnson.id,
    status: "VOID",
    issueDate: new Date(now.getTime() - 30 * day),
    dueDate: new Date(now.getTime()),
    paymentTerms: "DUE_ON_RECEIPT",
    categoryId: catLandscaping.id,
    memo: "Voided - customer changed project scope",
    lineItems: [
      { description: "Backyard fence installation", quantity: 1, unitPrice: 3200, sortOrder: 0 },
      { description: "Gate hardware and installation", quantity: 1, unitPrice: 450, sortOrder: 1 },
    ],
  });

  console.log("Seeded 8 invoices with line items.");

  // Payments
  // Recalculate totals for payment amounts
  const inv1001Subtotal = 4 * 175 + 350 + 425; // 1475
  const inv1001Total = Math.round((inv1001Subtotal + inv1001Subtotal * taxRate) * 100) / 100; // 1578.25

  const inv1002Subtotal = 1200 + 650 + 480 + 375; // 2705
  const inv1002Total = Math.round((inv1002Subtotal + inv1002Subtotal * taxRate) * 100) / 100; // 2894.35

  const inv1003Subtotal = 275 + 5 * 85 + 350; // 1050
  const inv1003Total = Math.round((inv1003Subtotal + inv1003Subtotal * taxRate) * 100) / 100; // 1123.50

  await Promise.all([
    // Payment for INV-1001 (full, CHECK)
    prisma.payment.create({
      data: {
        invoiceId: inv1001.id,
        clientId: sunridge.id,
        amount: inv1001Total,
        method: "CHECK",
        reference: "Check #4892",
        date: new Date(now.getTime() - 20 * day),
        notes: "Received via mail",
        userId,
      },
    }),
    // Payment for INV-1002 (full, ACH)
    prisma.payment.create({
      data: {
        invoiceId: inv1002.id,
        clientId: oakwood.id,
        amount: inv1002Total,
        method: "ACH",
        reference: "ACH-20260118-7741",
        date: new Date(now.getTime() - 18 * day),
        notes: "Electronic transfer from Oakwood HOA operating account",
        userId,
      },
    }),
    // Partial payment 1 for INV-1003 (CREDIT_CARD)
    prisma.payment.create({
      data: {
        invoiceId: inv1003.id,
        clientId: martinez.id,
        amount: 500,
        method: "CREDIT_CARD",
        reference: "CC-ending-4219",
        date: new Date(now.getTime() - 15 * day),
        notes: "Partial payment - Visa ending 4219",
        userId,
      },
    }),
    // Partial payment 2 for INV-1003 (CHECK)
    prisma.payment.create({
      data: {
        invoiceId: inv1003.id,
        clientId: martinez.id,
        amount: 200,
        method: "CHECK",
        reference: "Check #1037",
        date: new Date(now.getTime() - 8 * day),
        notes: "Second partial payment",
        userId,
      },
    }),
    // Extra payment on INV-1001 account credit (ACH) - demonstrating overpayment tracking
    prisma.payment.create({
      data: {
        invoiceId: inv1001.id,
        clientId: sunridge.id,
        amount: 0,
        method: "ACH",
        reference: "ACH-20260125-CREDIT",
        date: new Date(now.getTime() - 16 * day),
        notes: "Account credit memo - prepayment for March services",
        userId,
      },
    }),
  ]);

  // Update amountPaid on the PAID and PARTIAL invoices
  await prisma.invoice.update({
    where: { id: inv1001.id },
    data: { amountPaid: inv1001Total },
  });
  await prisma.invoice.update({
    where: { id: inv1002.id },
    data: { amountPaid: inv1002Total },
  });
  await prisma.invoice.update({
    where: { id: inv1003.id },
    data: { amountPaid: 700 },
  });

  console.log("Seeded 5 payments.");

  // Estimates
  // EST-001: SENT - Patio installation for Johnson
  await prisma.estimate.create({
    data: {
      estimateNumber: "EST-001",
      clientId: johnson.id,
      status: "SENT",
      issueDate: new Date(now.getTime() - 7 * day),
      expiresAt: new Date(now.getTime() + 23 * day),
      subtotal: 4500,
      taxRate,
      taxAmount: Math.round(4500 * taxRate * 100) / 100,
      total: Math.round(4500 * (1 + taxRate) * 100) / 100,
      notes: "Estimate valid for 30 days. Materials and labor included.",
      categoryId: catLandscaping.id,
      userId,
      lineItems: {
        create: [
          {
            description: "Flagstone patio installation (400 sq ft)",
            quantity: 1,
            unitPrice: 3200,
            amount: 3200,
            sortOrder: 0,
          },
          {
            description: "Patio furniture pad (concrete)",
            quantity: 1,
            unitPrice: 450,
            amount: 450,
            sortOrder: 1,
          },
          {
            description: "Landscape lighting (6 fixtures)",
            quantity: 6,
            unitPrice: 141.67,
            amount: 850,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // EST-002: ACCEPTED - Tree removal for Oakwood
  await prisma.estimate.create({
    data: {
      estimateNumber: "EST-002",
      clientId: oakwood.id,
      status: "ACCEPTED",
      issueDate: new Date(now.getTime() - 14 * day),
      expiresAt: new Date(now.getTime() + 16 * day),
      subtotal: 1200,
      taxRate,
      taxAmount: Math.round(1200 * taxRate * 100) / 100,
      total: Math.round(1200 * (1 + taxRate) * 100) / 100,
      notes: "Includes stump grinding and debris removal. Tree is a 40ft dead ash.",
      categoryId: catLandscaping.id,
      userId,
      lineItems: {
        create: [
          {
            description: "Dead ash tree removal (40 ft)",
            quantity: 1,
            unitPrice: 800,
            amount: 800,
            sortOrder: 0,
          },
          {
            description: "Stump grinding",
            quantity: 1,
            unitPrice: 250,
            amount: 250,
            sortOrder: 1,
          },
          {
            description: "Debris hauling and disposal",
            quantity: 1,
            unitPrice: 150,
            amount: 150,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // EST-003: CONVERTED - Landscape redesign for Sunridge -> linked to INV-1006
  // We'll fetch INV-1006 to get its ID for the link
  const inv1006 = await prisma.invoice.findUnique({
    where: { invoiceNumber: "INV-1006" },
  });

  await prisma.estimate.create({
    data: {
      estimateNumber: "EST-003",
      clientId: sunridge.id,
      status: "CONVERTED",
      issueDate: new Date(now.getTime() - 21 * day),
      expiresAt: new Date(now.getTime() - 1 * day),
      subtotal: 8500,
      taxRate,
      taxAmount: Math.round(8500 * taxRate * 100) / 100,
      total: Math.round(8500 * (1 + taxRate) * 100) / 100,
      notes: "Full landscape redesign for Building C courtyard. Approved by Karen Whitfield.",
      convertedInvoiceId: inv1006?.id ?? undefined,
      categoryId: catLandscaping.id,
      userId,
      lineItems: {
        create: [
          {
            description: "Landscape design and planning",
            quantity: 1,
            unitPrice: 1500,
            amount: 1500,
            sortOrder: 0,
          },
          {
            description: "Demolition and site preparation",
            quantity: 1,
            unitPrice: 2000,
            amount: 2000,
            sortOrder: 1,
          },
          {
            description: "Plant material and installation",
            quantity: 1,
            unitPrice: 3500,
            amount: 3500,
            sortOrder: 2,
          },
          {
            description: "Irrigation system upgrade",
            quantity: 1,
            unitPrice: 1500,
            amount: 1500,
            sortOrder: 3,
          },
        ],
      },
    },
  });

  console.log("Seeded 3 estimates with line items.");

  // Expenses
  const expenses = [
    {
      description: "Diesel fuel - truck fleet (120 gallons)",
      amount: 468.0,
      date: new Date(now.getTime() - 3 * day),
      categoryId: catFuelMaterials.id,
      clientId: null as string | null,
      vendor: "Denver Fuel Supply",
      method: "ACH",
      reference: "DFS-INV-8821",
      isBillable: false,
      isReimbursable: false,
      notes: "Weekly fuel delivery",
      userId,
    },
    {
      description: "Mulch bags (40 bags, premium hardwood)",
      amount: 320.0,
      date: new Date(now.getTime() - 5 * day),
      categoryId: catFuelMaterials.id,
      clientId: martinez.id,
      vendor: "Home Depot - Lakewood",
      method: "CREDIT_CARD",
      reference: "HD-receipt-44821",
      isBillable: true,
      isReimbursable: false,
      notes: "For Martinez spring cleanup job",
      userId,
    },
    {
      description: "Skid steer rental (3 days)",
      amount: 750.0,
      date: new Date(now.getTime() - 12 * day),
      categoryId: catEquipmentRepair.id,
      clientId: sunridge.id,
      vendor: "Rocky Mountain Equipment Co.",
      method: "CHECK",
      reference: "Check #2245",
      isBillable: true,
      isReimbursable: false,
      notes: "Used for Building C courtyard demolition",
      userId,
    },
    {
      description: "Mower blade replacement (3 sets)",
      amount: 189.0,
      date: new Date(now.getTime() - 15 * day),
      categoryId: catEquipmentRepair.id,
      clientId: null,
      vendor: "Ace Hardware - Denver",
      method: "CREDIT_CARD",
      reference: "ACE-7741",
      isBillable: false,
      isReimbursable: false,
      notes: "Replacement blades for John Deere Z930M",
      userId,
    },
    {
      description: "Office printer paper and ink cartridges",
      amount: 124.5,
      date: new Date(now.getTime() - 18 * day),
      categoryId: catOfficeSupplies.id,
      clientId: null,
      vendor: "Staples",
      method: "CREDIT_CARD",
      reference: "STP-order-992147",
      isBillable: false,
      isReimbursable: false,
      notes: null,
      userId,
    },
    {
      description: "Fertilizer - 20 bags granular 10-10-10",
      amount: 560.0,
      date: new Date(now.getTime() - 22 * day),
      categoryId: catFuelMaterials.id,
      clientId: oakwood.id,
      vendor: "SiteOne Landscape Supply",
      method: "CHECK",
      reference: "Check #2238",
      isBillable: true,
      isReimbursable: false,
      notes: "Spring fertilizer application for Oakwood common areas",
      userId,
    },
    {
      description: "Diesel fuel - truck fleet (110 gallons)",
      amount: 429.0,
      date: new Date(now.getTime() - 10 * day),
      categoryId: catFuelMaterials.id,
      clientId: null,
      vendor: "Denver Fuel Supply",
      method: "ACH",
      reference: "DFS-INV-8807",
      isBillable: false,
      isReimbursable: false,
      notes: "Weekly fuel delivery",
      userId,
    },
    {
      description: "Chainsaw chain sharpening and bar oil",
      amount: 65.0,
      date: new Date(now.getTime() - 28 * day),
      categoryId: catEquipmentRepair.id,
      clientId: null,
      vendor: "Front Range Small Engine",
      method: "CASH",
      reference: null,
      isBillable: false,
      isReimbursable: false,
      notes: "Stihl MS 271 maintenance",
      userId,
    },
    {
      description: "Landscape fabric and staples (500 ft roll)",
      amount: 215.0,
      date: new Date(now.getTime() - 32 * day),
      categoryId: catFuelMaterials.id,
      clientId: sunridge.id,
      vendor: "SiteOne Landscape Supply",
      method: "CREDIT_CARD",
      reference: "S1-order-10284",
      isBillable: true,
      isReimbursable: false,
      notes: "Building A flower bed renovation",
      userId,
    },
    {
      description: "QuickBooks subscription (monthly)",
      amount: 55.0,
      date: new Date(now.getTime() - 1 * day),
      categoryId: catOfficeSupplies.id,
      clientId: null,
      vendor: "Intuit",
      method: "CREDIT_CARD",
      reference: "QB-auto-0221",
      isBillable: false,
      isReimbursable: false,
      notes: "Monthly accounting software subscription",
      userId,
    },
  ];

  await prisma.expense.createMany({ data: expenses });
  console.log(`Seeded ${expenses.length} expenses.`);

  // Recurring Invoice
  await prisma.recurringInvoice.create({
    data: {
      clientId: sunridge.id,
      frequency: "MONTHLY",
      nextDate: new Date(now.getTime() + 8 * day),
      isActive: true,
      categoryId: catMaintenance.id,
      templateData: JSON.stringify({
        lineItems: [
          {
            description: "Weekly lawn maintenance (4 visits)",
            quantity: 4,
            unitPrice: 175,
          },
          {
            description: "Common area flower bed maintenance",
            quantity: 1,
            unitPrice: 250,
          },
          {
            description: "Parking lot sweeping and cleanup",
            quantity: 2,
            unitPrice: 125,
          },
        ],
        paymentTerms: "NET_30",
        taxRate: 0.07,
        notes: "Monthly recurring - Sunridge Property Management",
        memo: "Thank you for your continued business!",
      }),
      userId,
    },
  });
  console.log("Seeded 1 recurring invoice.");

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
