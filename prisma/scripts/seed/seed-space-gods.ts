/**
 * Seed Space Gods Inc. apps with realistic demo data.
 *
 * Space Gods Inc. is a space industry company that provides consulting services
 * and manufactures space thrusters (SGX product line).
 *
 * Usage: npx tsx prisma/scripts/seed/seed-space-gods.ts
 */

const ADMIN_EMAIL = "admin@go4it.live";
const ADMIN_PASSWORD = process.env.GO4IT_ADMIN_PASSWORD || process.env.FLY_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("GO4IT_ADMIN_PASSWORD or FLY_ADMIN_PASSWORD is required");
  process.exit(1);
}

const APPS = {
  gocrm: "https://go4it-space-gods-inc-cmmdwif2.fly.dev",
  goinvoice: "https://go4it-space-gods-inc-cmmdwk90.fly.dev",
  goproject: "https://go4it-space-gods-inc-cmm48cog.fly.dev",
  goinventory: "https://go4it-space-gods-inc-cmmb73i0.fly.dev",
  gosupport: "https://go4it-space-gods-inc-cmmdw3mc.fly.dev",
  gohr: "https://go4it-space-gods-inc-cmmb9pcf.fly.dev",
};

// ============================================
// Auth helper — login to NextAuth and get session cookie
// ============================================

async function login(baseUrl: string): Promise<string> {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  if (!csrfRes.ok) throw new Error(`CSRF fetch failed for ${baseUrl}: ${csrfRes.status}`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie?.() || [];

  // 2. Login with credentials
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.join("; "),
    },
    body: new URLSearchParams({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD!,
      csrfToken,
    }),
    redirect: "manual",
  });

  // Check for auth failure (redirect to /auth?error=...)
  const location = loginRes.headers.get("location") || "";
  if (location.includes("error=")) {
    throw new Error(`Login failed for ${baseUrl} — credentials rejected`);
  }

  // Collect cookies (don't follow redirect — NEXTAUTH_URL may point to 0.0.0.0)
  const allCookies = [...csrfCookies, ...(loginRes.headers.getSetCookie?.() || [])];

  // Extract session cookies
  const sessionCookie = allCookies
    .map((c) => c.split(";")[0])
    .filter((c) => c.includes("authjs") || c.includes("next-auth"))
    .join("; ");

  if (!sessionCookie) {
    throw new Error(`Login failed for ${baseUrl} — no session cookie received`);
  }

  return sessionCookie;
}

async function post(baseUrl: string, cookie: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  POST ${path} failed (${res.status}): ${text}`);
    return null;
  }
  return res.json();
}

async function get(baseUrl: string, cookie: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return null;
  return res.json();
}

// ============================================
// Seed Data
// ============================================

async function seedCRM(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoCRM ---");

  // Companies
  const companies: Record<string, unknown>[] = [];
  const companyData = [
    { name: "Axiom Space", industry: "Space Station", website: "axiomspace.com", phone: "+1-713-555-0101", address: "1290 Hercules Ave", city: "Houston", state: "TX", zip: "77058" },
    { name: "Rocket Lab USA", industry: "Launch Services", website: "rocketlabusa.com", phone: "+1-562-555-0202", address: "3881 McGowen St", city: "Long Beach", state: "CA", zip: "90808" },
    { name: "Northrop Grumman", industry: "Defense & Aerospace", website: "northropgrumman.com", phone: "+1-703-555-0303", address: "2980 Fairview Park Dr", city: "Falls Church", state: "VA", zip: "22042" },
    { name: "Firefly Aerospace", industry: "Launch Services", website: "fireflyspace.com", phone: "+1-512-555-0404", address: "1320 Arrow Point Dr", city: "Cedar Park", state: "TX", zip: "78613" },
    { name: "Relativity Space", industry: "Launch Vehicles", website: "relativityspace.com", phone: "+1-562-555-0505", address: "3500 E Wardlow Rd", city: "Long Beach", state: "CA", zip: "90807" },
    { name: "Astrobotic Technology", industry: "Lunar Landers", website: "astrobotic.com", phone: "+1-412-555-0606", address: "1016 N Lincoln Ave", city: "Pittsburgh", state: "PA", zip: "15233" },
  ];

  for (const c of companyData) {
    const result = await post(baseUrl, cookie, "/api/companies", c);
    if (result) companies.push(result);
    console.log(`  Company: ${c.name} ${result ? "OK" : "FAIL"}`);
  }

  // Contacts
  const contacts: Record<string, unknown>[] = [];
  const contactData = [
    { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@axiomspace.com", phone: "+1-713-555-1001", jobTitle: "VP of Propulsion", stage: "CUSTOMER", companyId: 0 },
    { firstName: "Marcus", lastName: "Webb", email: "marcus.webb@axiomspace.com", phone: "+1-713-555-1002", jobTitle: "Procurement Manager", stage: "CUSTOMER", companyId: 0 },
    { firstName: "Elena", lastName: "Rodriguez", email: "elena.rodriguez@rocketlabusa.com", phone: "+1-562-555-2001", jobTitle: "Chief Engineer", stage: "PROSPECT", companyId: 1 },
    { firstName: "James", lastName: "Kowalski", email: "james.kowalski@northropgrumman.com", phone: "+1-703-555-3001", jobTitle: "Program Director", stage: "CUSTOMER", companyId: 2 },
    { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@northropgrumman.com", phone: "+1-703-555-3002", jobTitle: "Systems Architect", stage: "CUSTOMER", companyId: 2 },
    { firstName: "David", lastName: "Okafor", email: "david.okafor@fireflyspace.com", phone: "+1-512-555-4001", jobTitle: "Propulsion Lead", stage: "LEAD", companyId: 3 },
    { firstName: "Amanda", lastName: "Kessler", email: "amanda.kessler@relativityspace.com", phone: "+1-562-555-5001", jobTitle: "Director of Engineering", stage: "PROSPECT", companyId: 4 },
    { firstName: "Tom", lastName: "Nguyen", email: "tom.nguyen@astrobotic.com", phone: "+1-412-555-6001", jobTitle: "Lunar Systems Manager", stage: "LEAD", companyId: 5 },
    { firstName: "Rachel", lastName: "Kim", email: "rachel.kim@nasa.gov", phone: "+1-202-555-7001", jobTitle: "Mission Integration Lead", stage: "PROSPECT", source: "REFERRAL" },
    { firstName: "Carlos", lastName: "Mendez", email: "carlos.mendez@spacex.com", phone: "+1-310-555-8001", jobTitle: "Sr. Propulsion Engineer", stage: "LEAD", source: "CONFERENCE" },
  ];

  for (const c of contactData) {
    const body: Record<string, unknown> = { ...c };
    if (typeof c.companyId === "number" && companies[c.companyId]) {
      body.companyId = (companies[c.companyId] as { id: string }).id;
    } else {
      delete body.companyId;
    }
    const result = await post(baseUrl, cookie, "/api/contacts", body);
    if (result) contacts.push(result);
    console.log(`  Contact: ${c.firstName} ${c.lastName} ${result ? "OK" : "FAIL"}`);
  }

  // Deals
  const dealData = [
    { title: "Axiom Station Module Thrusters", contactId: 0, value: 2400000, stage: "COMMITTED", companyId: 0 },
    { title: "Axiom Thruster Maintenance Contract", contactId: 1, value: 180000, stage: "WON", companyId: 0 },
    { title: "Rocket Lab Neutron Upper Stage", contactId: 2, value: 850000, stage: "QUOTED", companyId: 1 },
    { title: "Northrop Grumman Cygnus Upgrade", contactId: 3, value: 3200000, stage: "WON", companyId: 2 },
    { title: "Northrop GEM-63XL Consulting", contactId: 4, value: 420000, stage: "INTERESTED", companyId: 2 },
    { title: "Firefly Alpha Engine Evaluation", contactId: 5, value: 150000, stage: "INTERESTED", companyId: 3 },
    { title: "Relativity Terran R Thruster RFP", contactId: 6, value: 1800000, stage: "QUOTED", companyId: 4 },
    { title: "Astrobotic Griffin Lander Thrusters", contactId: 7, value: 650000, stage: "INTERESTED", companyId: 5 },
  ];

  for (const d of dealData) {
    const body: Record<string, unknown> = {
      title: d.title,
      value: d.value,
      stage: d.stage,
      contactId: (contacts[d.contactId] as { id: string })?.id,
    };
    if (typeof d.companyId === "number" && companies[d.companyId]) {
      body.companyId = (companies[d.companyId] as { id: string }).id;
    }
    const result = await post(baseUrl, cookie, "/api/deals", body);
    console.log(`  Deal: ${d.title} ${result ? "OK" : "FAIL"}`);
  }

  // Activities
  const activityData = [
    { type: "MEETING", subject: "Thruster spec review with Axiom engineering", contactId: 0, description: "Reviewed SGX-200 specifications for station module. Sarah approved thermal performance data.", duration: 90 },
    { type: "CALL", subject: "Follow-up on Neutron upper stage proposal", contactId: 2, description: "Elena requested revised pricing for 5-unit batch order.", duration: 30 },
    { type: "EMAIL", subject: "Cygnus upgrade contract signed", contactId: 3, description: "James confirmed final contract terms. PO incoming this week." },
    { type: "MEETING", subject: "Relativity Terran R technical deep-dive", contactId: 6, description: "On-site at Relativity HQ. Presented SGX-300 prototype test results.", duration: 120 },
    { type: "CALL", subject: "Initial discovery call with Firefly", contactId: 5, description: "David interested in engine evaluation for Alpha vehicle. Sending capabilities deck.", duration: 45 },
    { type: "NOTE", subject: "NASA contact from conference", contactId: 8, description: "Met Rachel Kim at Space Symposium. She oversees mission integration and is interested in our consulting services for Artemis subcontractors." },
    { type: "EMAIL", subject: "Astrobotic Griffin lander RFI response", contactId: 7, description: "Sent technical response to their RFI for landing thruster package." },
    { type: "MEETING", subject: "Quarterly business review with Northrop", contactId: 3, description: "QBR covering Cygnus delivery timeline, GEM-63XL consulting scope, and 2027 pipeline.", duration: 60 },
  ];

  for (const a of activityData) {
    const body: Record<string, unknown> = { ...a };
    body.contactId = (contacts[a.contactId] as { id: string })?.id;
    const result = await post(baseUrl, cookie, "/api/activities", body);
    console.log(`  Activity: ${a.subject.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
  }
}

async function seedInvoice(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoInvoice ---");

  // Clients
  const clients: Record<string, unknown>[] = [];
  const clientData = [
    { name: "Axiom Space", email: "accounts@axiomspace.com", phone: "+1-713-555-0101", address: "1290 Hercules Ave", city: "Houston", state: "TX", zip: "77058" },
    { name: "Rocket Lab USA", email: "billing@rocketlabusa.com", phone: "+1-562-555-0202", address: "3881 McGowen St", city: "Long Beach", state: "CA", zip: "90808" },
    { name: "Northrop Grumman", email: "ap@northropgrumman.com", phone: "+1-703-555-0303", address: "2980 Fairview Park Dr", city: "Falls Church", state: "VA", zip: "22042" },
    { name: "Firefly Aerospace", email: "finance@fireflyspace.com", phone: "+1-512-555-0404", address: "1320 Arrow Point Dr", city: "Cedar Park", state: "TX", zip: "78613" },
    { name: "Astrobotic Technology", email: "ap@astrobotic.com", phone: "+1-412-555-0606", address: "1016 N Lincoln Ave", city: "Pittsburgh", state: "PA", zip: "15233" },
  ];

  for (const c of clientData) {
    const result = await post(baseUrl, cookie, "/api/clients", c);
    if (result) clients.push(result);
    console.log(`  Client: ${c.name} ${result ? "OK" : "FAIL"}`);
  }

  // Invoices
  const invoiceData = [
    {
      clientIdx: 0, dueDate: "2026-03-15", issueDate: "2026-02-15", terms: "Net 30",
      items: [
        { description: "SGX-200 Thruster Unit (x4)", quantity: 4, unitPrice: 320000 },
        { description: "Integration engineering support (40 hrs)", quantity: 40, unitPrice: 350 },
      ],
    },
    {
      clientIdx: 0, dueDate: "2026-04-01", issueDate: "2026-03-01", terms: "Net 30",
      items: [
        { description: "Thruster maintenance — Q1 service", quantity: 1, unitPrice: 45000 },
        { description: "Replacement valve assemblies (x2)", quantity: 2, unitPrice: 8500 },
      ],
    },
    {
      clientIdx: 2, dueDate: "2026-02-28", issueDate: "2026-01-28", terms: "Net 30",
      items: [
        { description: "Cygnus propulsion upgrade — Phase 1", quantity: 1, unitPrice: 1600000 },
        { description: "Systems integration consulting (160 hrs)", quantity: 160, unitPrice: 375 },
      ],
    },
    {
      clientIdx: 2, dueDate: "2026-03-30", issueDate: "2026-02-28", terms: "Net 30",
      items: [
        { description: "Cygnus propulsion upgrade — Phase 2", quantity: 1, unitPrice: 1600000 },
      ],
    },
    {
      clientIdx: 1, dueDate: "2026-04-15", issueDate: "2026-03-15", terms: "Net 30",
      items: [
        { description: "Neutron upper stage thruster engineering study", quantity: 1, unitPrice: 125000 },
        { description: "Prototype thruster testing (test stand rental)", quantity: 5, unitPrice: 15000 },
      ],
    },
    {
      clientIdx: 3, dueDate: "2026-04-30", issueDate: "2026-03-30", terms: "Net 30",
      items: [
        { description: "Alpha engine evaluation — technical assessment", quantity: 1, unitPrice: 75000 },
        { description: "Test data analysis and reporting", quantity: 80, unitPrice: 300 },
      ],
    },
    {
      clientIdx: 4, dueDate: "2026-05-15", issueDate: "2026-04-15", terms: "Net 30",
      items: [
        { description: "Griffin lander thruster feasibility study", quantity: 1, unitPrice: 95000 },
      ],
    },
  ];

  const invoices: Record<string, unknown>[] = [];
  for (const inv of invoiceData) {
    const body = {
      clientId: (clients[inv.clientIdx] as { id: string })?.id,
      dueDate: inv.dueDate,
      issueDate: inv.issueDate,
      terms: inv.terms,
      items: inv.items,
    };
    const result = await post(baseUrl, cookie, "/api/invoices", body);
    if (result) invoices.push(result);
    console.log(`  Invoice: ${inv.items[0].description.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
  }

  // Payments (for completed invoices)
  const paymentData = [
    { invoiceIdx: 0, amount: 1294000, method: "BANK_TRANSFER", reference: "ACH-AX-20260301" },
    { invoiceIdx: 2, amount: 1660000, method: "BANK_TRANSFER", reference: "WIRE-NG-20260228" },
    { invoiceIdx: 2, amount: 400000, method: "BANK_TRANSFER", reference: "WIRE-NG-20260315-PARTIAL", notes: "Partial payment — remaining balance pending" },
  ];

  for (const p of paymentData) {
    const invoice = invoices[p.invoiceIdx] as { id: string } | undefined;
    if (!invoice) continue;
    const body = {
      invoiceId: invoice.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
    };
    const result = await post(baseUrl, cookie, "/api/payments", body);
    console.log(`  Payment: $${p.amount.toLocaleString()} ${result ? "OK" : "FAIL"}`);
  }

  // Expenses
  const expenseData = [
    { description: "Test stand facility rental — Stennis Space Center", amount: 85000, category: "FACILITIES", vendor: "NASA SSC", date: "2026-02-15" },
    { description: "Titanium alloy stock (Grade 5, 500 kg)", amount: 42000, category: "MATERIALS", vendor: "Howmet Aerospace", date: "2026-02-20" },
    { description: "Space Symposium conference registration (5 attendees)", amount: 12500, category: "TRAVEL", vendor: "Space Foundation", date: "2026-01-15" },
    { description: "Vibration testing equipment calibration", amount: 18000, category: "EQUIPMENT", vendor: "National Instruments", date: "2026-03-01" },
    { description: "Thermal vacuum chamber monthly lease", amount: 35000, category: "FACILITIES", vendor: "ATA Aerospace", date: "2026-03-01" },
    { description: "Flight heritage documentation — AS9100 audit", amount: 22000, category: "PROFESSIONAL", vendor: "SAI Global", date: "2026-02-28" },
  ];

  for (const e of expenseData) {
    const result = await post(baseUrl, cookie, "/api/expenses", e);
    console.log(`  Expense: ${e.description.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
  }
}

async function seedProject(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoProject ---");

  const projectData = [
    {
      name: "Axiom Station Module Thruster Integration",
      description: "Design, build, and integrate SGX-200 thrusters for Axiom Station commercial module. 4-unit delivery with full integration support.",
      color: "#9333ea",
      tasks: [
        { title: "Finalize SGX-200 thermal analysis", status: "done", dueDate: "2026-02-15" },
        { title: "Complete vibration qualification testing", status: "done", dueDate: "2026-02-28" },
        { title: "Deliver flight unit #1 to Axiom", status: "in_progress", dueDate: "2026-03-20" },
        { title: "Deliver flight units #2-4", status: "todo", dueDate: "2026-04-15" },
        { title: "On-site integration support at KSC", status: "todo", dueDate: "2026-05-01" },
        { title: "Pre-launch checkout and sign-off", status: "todo", dueDate: "2026-06-01" },
      ],
    },
    {
      name: "Northrop Cygnus Propulsion Upgrade",
      description: "Upgrade the Cygnus spacecraft propulsion system with next-gen thrusters. Phase 1: design review. Phase 2: hardware delivery.",
      color: "#3b82f6",
      tasks: [
        { title: "Complete preliminary design review (PDR)", status: "done", dueDate: "2026-01-30" },
        { title: "Critical design review (CDR)", status: "done", dueDate: "2026-02-28" },
        { title: "Manufacture prototype thruster assembly", status: "in_progress", dueDate: "2026-03-30" },
        { title: "Hot-fire testing at Stennis", status: "todo", dueDate: "2026-04-30" },
        { title: "Deliver flight hardware to Northrop", status: "todo", dueDate: "2026-06-15" },
      ],
    },
    {
      name: "SGX-300 Next-Gen Thruster Development",
      description: "Internal R&D program for the SGX-300 high-performance thruster. Targets 15% ISP improvement over SGX-200.",
      color: "#f97316",
      tasks: [
        { title: "Complete combustion chamber CFD analysis", status: "done", dueDate: "2026-01-15" },
        { title: "Design injector prototype", status: "in_progress", dueDate: "2026-03-15" },
        { title: "3D print injector test articles", status: "todo", dueDate: "2026-04-01" },
        { title: "Cold-flow testing of injector variants", status: "todo", dueDate: "2026-04-30" },
        { title: "Select final injector design", status: "todo", dueDate: "2026-05-15" },
        { title: "Build full-scale prototype engine", status: "todo", dueDate: "2026-07-01" },
        { title: "Qualification hot-fire test campaign", status: "todo", dueDate: "2026-09-01" },
      ],
    },
    {
      name: "Rocket Lab Neutron Thruster Study",
      description: "Engineering study for Rocket Lab's Neutron upper stage thruster requirements. Includes trade study and prototype testing.",
      color: "#ec4899",
      tasks: [
        { title: "Requirements gathering with Rocket Lab", status: "done", dueDate: "2026-02-01" },
        { title: "Trade study: SGX-200 vs custom design", status: "in_progress", dueDate: "2026-03-15" },
        { title: "Prepare test plan for prototype validation", status: "todo", dueDate: "2026-04-01" },
        { title: "Prototype hot-fire testing (3 burns)", status: "todo", dueDate: "2026-05-01" },
        { title: "Deliver final engineering report", status: "todo", dueDate: "2026-05-30" },
      ],
    },
  ];

  for (const p of projectData) {
    const project = await post(baseUrl, cookie, "/api/projects", {
      name: p.name,
      description: p.description,
      color: p.color,
    });
    console.log(`  Project: ${p.name} ${project ? "OK" : "FAIL"}`);

    if (project) {
      for (const t of p.tasks) {
        const result = await post(baseUrl, cookie, `/api/projects/${(project as { id: string }).id}/tasks`, t);
        console.log(`    Task: ${t.title.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
      }
    }
  }
}

async function seedInventory(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoInventory ---");

  // Categories
  const categories: Record<string, unknown>[] = [];
  const categoryData = [
    { name: "Thruster Assemblies" },
    { name: "Propellant Components" },
    { name: "Raw Materials" },
    { name: "Test Equipment" },
    { name: "Spare Parts" },
  ];

  for (const c of categoryData) {
    const result = await post(baseUrl, cookie, "/api/categories", c);
    if (result) categories.push(result);
    console.log(`  Category: ${c.name} ${result ? "OK" : "FAIL"}`);
  }

  // Suppliers
  const suppliers: Record<string, unknown>[] = [];
  const supplierData = [
    { name: "Howmet Aerospace", contactName: "Richard Lange", email: "orders@howmet.com", phone: "+1-412-555-7001", address: "201 Isabella St", city: "Pittsburgh", state: "PA", zip: "15212", notes: "Primary titanium and superalloy supplier" },
    { name: "Moog Inc.", contactName: "Linda Park", email: "space.sales@moog.com", phone: "+1-716-555-7002", address: "400 Jamison Rd", city: "East Aurora", state: "NY", zip: "14052", notes: "Valve assemblies and flow control" },
    { name: "Aerojet Rocketdyne Parts", contactName: "Steve Blanton", email: "parts@aerojet.com", phone: "+1-916-555-7003", address: "4555 E McDowell Rd", city: "Sacramento", state: "CA", zip: "95842", notes: "Igniter assemblies and injector components" },
    { name: "Parker Hannifin Aerospace", contactName: "Diane Cho", email: "aerospace@parker.com", phone: "+1-949-555-7004", address: "14300 Alton Pkwy", city: "Irvine", state: "CA", zip: "92618", notes: "Seals, fittings, tubing" },
  ];

  for (const s of supplierData) {
    const result = await post(baseUrl, cookie, "/api/suppliers", s);
    if (result) suppliers.push(result);
    console.log(`  Supplier: ${s.name} ${result ? "OK" : "FAIL"}`);
  }

  // Products
  const products: Record<string, unknown>[] = [];
  const productData = [
    { name: "SGX-100 Thruster Assembly", sku: "SGX-100-ASM", description: "100N class bipropellant thruster for small satellite applications", unitPrice: 85000, costPrice: 52000, quantity: 12, reorderPoint: 3, unit: "unit", categoryIdx: 0 },
    { name: "SGX-200 Thruster Assembly", sku: "SGX-200-ASM", description: "500N class bipropellant thruster for station and spacecraft applications", unitPrice: 320000, costPrice: 195000, quantity: 6, reorderPoint: 2, unit: "unit", categoryIdx: 0 },
    { name: "SGX-300 Prototype Thruster", sku: "SGX-300-PROTO", description: "Next-gen 800N thruster — development prototype (not for flight)", unitPrice: 0, costPrice: 280000, quantity: 2, reorderPoint: 0, unit: "unit", status: "ACTIVE", categoryIdx: 0 },
    { name: "Thruster Valve Assembly", sku: "TVA-200-V3", description: "Bi-stable propellant valve for SGX-200 series", unitPrice: 8500, costPrice: 4200, quantity: 24, reorderPoint: 8, unit: "unit", categoryIdx: 4 },
    { name: "Combustion Chamber Insert", sku: "CCI-200-RH", description: "Rhenium-lined combustion chamber for SGX-200", unitPrice: 42000, costPrice: 28000, quantity: 8, reorderPoint: 3, unit: "unit", categoryIdx: 4 },
    { name: "Titanium Alloy Sheet (Grade 5)", sku: "TI-6AL4V-SHT", description: "Ti-6Al-4V sheet, 1.5mm thickness, 1200x2400mm", unitPrice: 850, costPrice: 620, quantity: 45, reorderPoint: 15, unit: "sheet", categoryIdx: 2 },
    { name: "Inconel 718 Bar Stock", sku: "IN718-BAR-25", description: "Inconel 718 round bar, 25mm diameter, 1m length", unitPrice: 380, costPrice: 245, quantity: 60, reorderPoint: 20, unit: "bar", categoryIdx: 2 },
    { name: "Hydrazine Fuel Line Assembly", sku: "HFL-300-SS", description: "316L SS fuel line with fittings, 300mm", unitPrice: 2200, costPrice: 1100, quantity: 18, reorderPoint: 6, unit: "unit", categoryIdx: 1 },
    { name: "Igniter Assembly (Pyrotechnic)", sku: "IGN-PYR-200", description: "Pyrotechnic igniter for SGX-200 series", unitPrice: 5500, costPrice: 3200, quantity: 15, reorderPoint: 5, unit: "unit", categoryIdx: 1 },
    { name: "Pressure Transducer (0-500 psi)", sku: "PT-500-HF", description: "High-frequency pressure transducer for test instrumentation", unitPrice: 3800, costPrice: 2100, quantity: 10, reorderPoint: 3, unit: "unit", categoryIdx: 3 },
  ];

  for (const p of productData) {
    const body: Record<string, unknown> = { ...p };
    if (typeof p.categoryIdx === "number" && categories[p.categoryIdx]) {
      body.categoryId = (categories[p.categoryIdx] as { id: string }).id;
    }
    delete body.categoryIdx;
    const result = await post(baseUrl, cookie, "/api/products", body);
    if (result) products.push(result);
    console.log(`  Product: ${p.name} ${result ? "OK" : "FAIL"}`);
  }

  // Purchase Orders
  const orderData = [
    {
      supplierIdx: 0, expectedDate: "2026-04-10", notes: "Q2 titanium restock",
      items: [
        { productIdx: 5, quantity: 30, unitPrice: 620 },
        { productIdx: 6, quantity: 40, unitPrice: 245 },
      ],
    },
    {
      supplierIdx: 1, expectedDate: "2026-03-25", notes: "Valve assemblies for Axiom delivery",
      items: [
        { productIdx: 3, quantity: 16, unitPrice: 4200 },
      ],
    },
    {
      supplierIdx: 2, expectedDate: "2026-04-15", notes: "Igniter batch for SGX-200 production",
      items: [
        { productIdx: 8, quantity: 10, unitPrice: 3200 },
      ],
    },
  ];

  for (const o of orderData) {
    const body = {
      supplierId: (suppliers[o.supplierIdx] as { id: string })?.id,
      expectedDate: o.expectedDate,
      notes: o.notes,
      items: o.items.map((item) => ({
        productId: (products[item.productIdx] as { id: string })?.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
    const result = await post(baseUrl, cookie, "/api/orders", body);
    console.log(`  PO: ${o.notes} ${result ? "OK" : "FAIL"}`);
  }
}

async function seedSupport(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoSupport ---");

  // KB Articles
  const kbData = [
    { title: "SGX-100 Installation Guide", content: "## SGX-100 Thruster Installation\n\n### Pre-Installation Checklist\n1. Verify thruster serial number matches shipping manifest\n2. Inspect mounting flange for damage\n3. Confirm propellant line routing clearance\n4. Review torque specifications (see Table 3.1)\n\n### Mounting Procedure\n1. Apply anti-seize compound to mounting bolts\n2. Torque bolts to 45 Nm in star pattern\n3. Connect propellant lines (fuel, oxidizer)\n4. Install instrumentation harness\n5. Perform leak check at 1.5x MEOP\n\n### Post-Installation Verification\n- Electrical continuity check on all valve coils\n- Verify thermocouple readings within range\n- Document installation with photos", status: "PUBLISHED" },
    { title: "SGX-200 Maintenance Schedule", content: "## SGX-200 Preventive Maintenance\n\n### Annual Inspection\n- Visual inspection of nozzle for erosion\n- Valve cycle count check (replace at 10,000 cycles)\n- Propellant filter inspection\n- Mounting bolt torque verification\n\n### Bi-Annual Service\n- Replace propellant filters\n- Calibrate pressure transducers\n- Flow test valve assemblies\n- Update maintenance log\n\n### Emergency Procedures\n- Propellant leak: Immediately safe system per SOP-400\n- Valve failure: Switch to redundant valve path\n- Anomalous chamber pressure: Abort and inspect", status: "PUBLISHED" },
    { title: "Propellant Handling Safety", content: "## Propellant Safety Guidelines\n\n**WARNING:** Hydrazine is toxic and carcinogenic. Follow all PPE requirements.\n\n### Required PPE\n- SCAPE suit or equivalent\n- Self-contained breathing apparatus\n- Chemical-resistant gloves (butyl rubber)\n- Face shield\n\n### Handling Procedures\n1. All propellant operations require buddy system\n2. Maintain exclusion zone (100m for hydrazine)\n3. Spill kit must be within 10m of operations\n4. Emergency shower within 30m\n\n### Emergency Contacts\n- Space Gods Safety: +1-713-555-9999\n- Poison Control: 1-800-222-1222", status: "PUBLISHED" },
  ];

  for (const kb of kbData) {
    const result = await post(baseUrl, cookie, "/api/kb", kb);
    console.log(`  KB: ${kb.title} ${result ? "OK" : "FAIL"}`);
  }

  // Tickets
  const ticketData = [
    { subject: "SGX-200 valve cycling slower than spec", description: "Unit SN-2024-0847 valve response time measured at 28ms, spec is 20ms max. Noticed during pre-integration testing at KSC. Axiom requesting resolution before module integration deadline.", customerName: "Sarah Chen", customerEmail: "sarah.chen@axiomspace.com", priority: "HIGH", category: "TECHNICAL" },
    { subject: "Request updated thermal data for SGX-200", description: "Need updated thermal analysis data for the SGX-200 in vacuum conditions at -40C to +85C range. Previous data package was revision B, we need revision C per CDR action item.", customerName: "James Kowalski", customerEmail: "james.kowalski@northropgrumman.com", priority: "MEDIUM", category: "TECHNICAL" },
    { subject: "Invoice discrepancy — PO #NG-2026-0412", description: "Invoice INV-2026-003 shows $1,660,000 but our PO was for $1,600,000. The $60,000 difference appears to be systems integration consulting hours that weren't in the original SOW. Please clarify.", customerName: "Priya Sharma", customerEmail: "priya.sharma@northropgrumman.com", priority: "MEDIUM", category: "BILLING" },
    { subject: "Spare valve assembly lead time inquiry", description: "We need 4x TVA-200-V3 valve assemblies for our spares inventory. What is current lead time? Can you expedite if we place order this week?", customerName: "Marcus Webb", customerEmail: "marcus.webb@axiomspace.com", priority: "LOW", category: "GENERAL" },
    { subject: "SGX-100 nozzle erosion after 200 cycles", description: "Observing higher than expected nozzle throat erosion on SGX-100 SN-2023-0391 after approximately 200 hot-fire cycles. Throat diameter has increased by 0.3mm. Is this within acceptable limits? Attached photos.", customerName: "Tom Nguyen", customerEmail: "tom.nguyen@astrobotic.com", priority: "HIGH", category: "TECHNICAL" },
    { subject: "Certificate of Conformance needed for Neutron study", description: "Rocket Lab quality team is requesting CoC documentation for all test articles used in the Neutron upper stage study. Can you provide certificates for the prototype thruster and test stand instrumentation?", customerName: "Elena Rodriguez", customerEmail: "elena.rodriguez@rocketlabusa.com", priority: "MEDIUM", category: "GENERAL" },
  ];

  for (const t of ticketData) {
    const result = await post(baseUrl, cookie, "/api/tickets", t);
    console.log(`  Ticket: ${t.subject.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
  }
}

async function seedHR(baseUrl: string, cookie: string) {
  console.log("\n--- Seeding GoHR ---");

  // Departments
  const departments: Record<string, unknown>[] = [];
  const deptData = [
    { name: "Engineering", description: "Propulsion design, testing, and integration", color: "#3b82f6" },
    { name: "Manufacturing", description: "Thruster production and assembly", color: "#f97316" },
    { name: "Business Development", description: "Sales, contracts, and partnerships", color: "#10b981" },
    { name: "Quality & Compliance", description: "AS9100, testing standards, and flight certification", color: "#8b5cf6" },
    { name: "Operations", description: "Finance, HR, and administration", color: "#ec4899" },
  ];

  for (const d of deptData) {
    const result = await post(baseUrl, cookie, "/api/departments", d);
    if (result) departments.push(result);
    console.log(`  Department: ${d.name} ${result ? "OK" : "FAIL"}`);
  }

  // Get existing users (provisioned team members)
  const users = await get(baseUrl, cookie, "/api/employees/users");
  console.log(`  Found ${Array.isArray(users) ? users.length : 0} users`);

  // If we can get users, create employee profiles
  // Otherwise just seed announcements
  if (Array.isArray(users) && users.length > 0) {
    const adminUser = users.find((u: { email: string }) => u.email === ADMIN_EMAIL);
    if (adminUser) {
      const result = await post(baseUrl, cookie, "/api/employees", {
        staffUserId: adminUser.id,
        employeeId: "SGI-2024-001",
        jobTitle: "CEO & Chief Engineer",
        hireDate: "2024-01-15",
        employmentType: "FULL_TIME",
        departmentId: (departments[0] as { id: string })?.id,
        phone: "+1-713-555-9000",
        salary: 285000,
      });
      console.log(`  Employee: CEO (admin) ${result ? "OK" : "FAIL"}`);
    }
  }

  // Announcements
  const announcementData = [
    { title: "Axiom Station Module Thruster Delivery Milestone", content: "Team — I'm thrilled to announce that Flight Unit #1 of the SGX-200 for Axiom Space has completed all qualification testing and is on track for delivery this month. This represents our first flight hardware delivery for a commercial space station. Huge thanks to the propulsion engineering team for hitting every milestone. Let's keep the momentum going for units #2-4!", priority: "HIGH", pinned: true },
    { title: "Q1 All-Hands Meeting — March 20", content: "Our quarterly all-hands is scheduled for March 20 at 2:00 PM CT in the main conference room. Remote team members can join via the usual video link.\n\nAgenda:\n- Q1 revenue and pipeline review\n- SGX-300 development update\n- New hire introductions\n- Open Q&A\n\nPlease submit questions in advance to ops@spacegods.com.", priority: "NORMAL" },
    { title: "New Safety Protocol for Propellant Operations", content: "Effective immediately, all propellant handling operations require a pre-operation briefing using the updated SOP-400 checklist. This applies to both hydrazine and NTO operations.\n\nThe updated SOP is available in GoWiki and printed copies are posted at each test cell.\n\nQuestions? Contact the Safety team.", priority: "HIGH" },
    { title: "Space Symposium Recap", content: "Great showing at Space Symposium last month. We made contact with 3 potential new customers and strengthened relationships with existing ones. Key takeaways:\n\n- Strong interest in SGX-300 from multiple launch providers\n- Astrobotic wants to discuss lunar lander thruster package\n- Several inquiries about our consulting services for Artemis subcontractors\n\nBD team will follow up on all leads this week.", priority: "NORMAL" },
  ];

  for (const a of announcementData) {
    const result = await post(baseUrl, cookie, "/api/announcements", a);
    console.log(`  Announcement: ${a.title.slice(0, 50)} ${result ? "OK" : "FAIL"}`);
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log("Space Gods Inc. — Seeding all 6 apps\n");
  console.log("Authenticating...");

  // Login to all apps in parallel
  const cookies: Record<string, string> = {};
  for (const [app, url] of Object.entries(APPS)) {
    try {
      cookies[app] = await login(url);
      console.log(`  ${app}: OK`);
    } catch (err) {
      console.error(`  ${app}: FAILED — ${err instanceof Error ? err.message : err}`);
      if (err instanceof Error && err.cause) console.error(`    cause:`, err.cause);
    }
  }

  // Seed each app
  if (cookies.gocrm) await seedCRM(APPS.gocrm, cookies.gocrm);
  if (cookies.goinvoice) await seedInvoice(APPS.goinvoice, cookies.goinvoice);
  if (cookies.goproject) await seedProject(APPS.goproject, cookies.goproject);
  if (cookies.goinventory) await seedInventory(APPS.goinventory, cookies.goinventory);
  if (cookies.gosupport) await seedSupport(APPS.gosupport, cookies.gosupport);
  if (cookies.gohr) await seedHR(APPS.gohr, cookies.gohr);

  console.log("\n=== Done! ===");
}

main().catch(console.error);
