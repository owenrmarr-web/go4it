// Direct Prisma seed for GoInventory — runs ON the Fly machine via SSH
// Usage: fly ssh console -a <app> -C "node /tmp/seed.js"

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "admin@go4it.live" } });
  if (!user) { console.error("Admin user not found"); return; }
  const uid = user.id;
  console.log("User:", uid);

  // Categories
  const cats = {};
  for (const c of [
    { name: "Thruster Assemblies" },
    { name: "Propellant Components" },
    { name: "Raw Materials" },
    { name: "Test Equipment" },
    { name: "Spare Parts" },
  ]) {
    const cat = await prisma.category.create({ data: { ...c, userId: uid } });
    cats[c.name] = cat.id;
    console.log("Category:", c.name);
  }

  // Suppliers
  const supps = {};
  for (const s of [
    { name: "Howmet Aerospace", contactName: "Richard Lange", email: "orders@howmet.com", phone: "+1-412-555-7001", address: "201 Isabella St", city: "Pittsburgh", state: "PA", zip: "15212", notes: "Primary titanium and superalloy supplier" },
    { name: "Moog Inc.", contactName: "Linda Park", email: "space.sales@moog.com", phone: "+1-716-555-7002", address: "400 Jamison Rd", city: "East Aurora", state: "NY", zip: "14052", notes: "Valve assemblies and flow control" },
    { name: "Aerojet Rocketdyne Parts", contactName: "Steve Blanton", email: "parts@aerojet.com", phone: "+1-916-555-7003", address: "4555 E McDowell Rd", city: "Sacramento", state: "CA", zip: "95842", notes: "Igniter assemblies and injector components" },
    { name: "Parker Hannifin Aerospace", contactName: "Diane Cho", email: "aerospace@parker.com", phone: "+1-949-555-7004", address: "14300 Alton Pkwy", city: "Irvine", state: "CA", zip: "92618", notes: "Seals, fittings, tubing" },
  ]) {
    const sup = await prisma.supplier.create({ data: { ...s, userId: uid } });
    supps[s.name] = sup.id;
    console.log("Supplier:", s.name);
  }

  // Products
  const prods = {};
  const productData = [
    { name: "SGX-100 Thruster Assembly", sku: "SGX-100-ASM", description: "100N class bipropellant thruster for small satellite applications", unitPrice: 85000, costPrice: 52000, quantity: 12, reorderPoint: 3, unit: "unit", cat: "Thruster Assemblies" },
    { name: "SGX-200 Thruster Assembly", sku: "SGX-200-ASM", description: "500N class bipropellant thruster for station and spacecraft applications", unitPrice: 320000, costPrice: 195000, quantity: 6, reorderPoint: 2, unit: "unit", cat: "Thruster Assemblies" },
    { name: "SGX-300 Prototype Thruster", sku: "SGX-300-PROTO", description: "Next-gen 800N thruster — development prototype (not for flight)", unitPrice: 0, costPrice: 280000, quantity: 2, reorderPoint: 0, unit: "unit", cat: "Thruster Assemblies" },
    { name: "Thruster Valve Assembly", sku: "TVA-200-V3", description: "Bi-stable propellant valve for SGX-200 series", unitPrice: 8500, costPrice: 4200, quantity: 24, reorderPoint: 8, unit: "unit", cat: "Spare Parts" },
    { name: "Combustion Chamber Insert", sku: "CCI-200-RH", description: "Rhenium-lined combustion chamber for SGX-200", unitPrice: 42000, costPrice: 28000, quantity: 8, reorderPoint: 3, unit: "unit", cat: "Spare Parts" },
    { name: "Titanium Alloy Sheet (Grade 5)", sku: "TI-6AL4V-SHT", description: "Ti-6Al-4V sheet, 1.5mm thickness, 1200x2400mm", unitPrice: 850, costPrice: 620, quantity: 45, reorderPoint: 15, unit: "sheet", cat: "Raw Materials" },
    { name: "Inconel 718 Bar Stock", sku: "IN718-BAR-25", description: "Inconel 718 round bar, 25mm diameter, 1m length", unitPrice: 380, costPrice: 245, quantity: 60, reorderPoint: 20, unit: "bar", cat: "Raw Materials" },
    { name: "Hydrazine Fuel Line Assembly", sku: "HFL-300-SS", description: "316L SS fuel line with fittings, 300mm", unitPrice: 2200, costPrice: 1100, quantity: 18, reorderPoint: 6, unit: "unit", cat: "Propellant Components" },
    { name: "Igniter Assembly (Pyrotechnic)", sku: "IGN-PYR-200", description: "Pyrotechnic igniter for SGX-200 series", unitPrice: 5500, costPrice: 3200, quantity: 15, reorderPoint: 5, unit: "unit", cat: "Propellant Components" },
    { name: "Pressure Transducer (0-500 psi)", sku: "PT-500-HF", description: "High-frequency pressure transducer for test instrumentation", unitPrice: 3800, costPrice: 2100, quantity: 10, reorderPoint: 3, unit: "unit", cat: "Test Equipment" },
  ];

  for (const p of productData) {
    const { cat, ...data } = p;
    const prod = await prisma.product.create({ data: { ...data, categoryId: cats[cat], userId: uid } });
    prods[p.name] = prod.id;
    console.log("Product:", p.name);
  }

  // Purchase Orders
  const orders = [
    { supplier: "Howmet Aerospace", expectedDate: new Date("2026-04-10"), notes: "Q2 titanium restock", items: [{ prod: "Titanium Alloy Sheet (Grade 5)", qty: 30, price: 620 }, { prod: "Inconel 718 Bar Stock", qty: 40, price: 245 }] },
    { supplier: "Moog Inc.", expectedDate: new Date("2026-03-25"), notes: "Valve assemblies for Axiom delivery", items: [{ prod: "Thruster Valve Assembly", qty: 16, price: 4200 }] },
    { supplier: "Aerojet Rocketdyne Parts", expectedDate: new Date("2026-04-15"), notes: "Igniter batch for SGX-200 production", items: [{ prod: "Igniter Assembly (Pyrotechnic)", qty: 10, price: 3200 }] },
  ];

  for (const o of orders) {
    const total = o.items.reduce((s, i) => s + i.qty * i.price, 0);
    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: supps[o.supplier],
        expectedDate: o.expectedDate,
        notes: o.notes,
        totalAmount: total,
        userId: uid,
        items: {
          create: o.items.map((i, idx) => ({
            productId: prods[i.prod],
            quantity: i.qty,
            unitPrice: i.price,
            totalPrice: i.qty * i.price,
            userId: uid,
          })),
        },
      },
    });
    console.log("PO:", o.notes);
  }

  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
