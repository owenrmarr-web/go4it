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

  // Categories
  const camping = await prisma.category.create({
    data: { name: "Camping Gear", color: "#22c55e", description: "Tents, sleeping bags, and camping essentials", userId },
  });
  const climbing = await prisma.category.create({
    data: { name: "Climbing Equipment", color: "#ef4444", description: "Ropes, harnesses, and climbing hardware", userId },
  });
  const cycling = await prisma.category.create({
    data: { name: "Cycling", color: "#3b82f6", description: "Bikes, helmets, and cycling accessories", userId },
  });
  const water = await prisma.category.create({
    data: { name: "Water Sports", color: "#06b6d4", description: "Kayaks, paddles, and water gear", userId },
  });
  const winter = await prisma.category.create({
    data: { name: "Winter Sports", color: "#8b5cf6", description: "Skis, snowboards, and cold weather gear", userId },
  });
  console.log("Seeded 5 categories.");

  // Products - 12 total, 3 below reorder point, 2 inactive
  const products = await Promise.all([
    prisma.product.create({
      data: { name: "Alpine Tent 4P", sku: "CAMP-001", unitPrice: 299.99, costPrice: 180.00, quantity: 24, reorderPoint: 10, unit: "each", status: "ACTIVE", categoryId: camping.id, userId, description: "4-person alpine tent with rain fly" },
    }),
    prisma.product.create({
      data: { name: "Down Sleeping Bag -20F", sku: "CAMP-002", unitPrice: 189.99, costPrice: 95.00, quantity: 3, reorderPoint: 8, unit: "each", status: "ACTIVE", categoryId: camping.id, userId, description: "Extreme cold rated sleeping bag" },
    }),
    prisma.product.create({
      data: { name: "Headlamp Pro 600", sku: "CAMP-003", unitPrice: 49.99, costPrice: 22.00, quantity: 45, reorderPoint: 15, unit: "each", status: "ACTIVE", categoryId: camping.id, userId, description: "600 lumen rechargeable headlamp" },
    }),
    prisma.product.create({
      data: { name: "Dynamic Climbing Rope 60m", sku: "CLIMB-001", unitPrice: 199.99, costPrice: 120.00, quantity: 5, reorderPoint: 6, unit: "each", status: "ACTIVE", categoryId: climbing.id, userId, description: "60m dynamic single rope, 9.8mm" },
    }),
    prisma.product.create({
      data: { name: "Climbing Harness Elite", sku: "CLIMB-002", unitPrice: 89.99, costPrice: 45.00, quantity: 18, reorderPoint: 8, unit: "each", status: "ACTIVE", categoryId: climbing.id, userId, description: "Adjustable sport climbing harness" },
    }),
    prisma.product.create({
      data: { name: "Carabiner Set (6-pack)", sku: "CLIMB-003", unitPrice: 34.99, costPrice: 15.00, quantity: 60, reorderPoint: 20, unit: "each", status: "INACTIVE", categoryId: climbing.id, userId, description: "Locking carabiner set, anodized aluminum" },
    }),
    prisma.product.create({
      data: { name: "Trail Mountain Bike", sku: "CYCLE-001", unitPrice: 899.99, costPrice: 550.00, quantity: 7, reorderPoint: 3, unit: "each", status: "ACTIVE", categoryId: cycling.id, userId, description: "Full suspension 29er mountain bike" },
    }),
    prisma.product.create({
      data: { name: "Cycling Helmet Aero", sku: "CYCLE-002", unitPrice: 79.99, costPrice: 35.00, quantity: 2, reorderPoint: 10, unit: "each", status: "ACTIVE", categoryId: cycling.id, userId, description: "Lightweight aero road cycling helmet" },
    }),
    prisma.product.create({
      data: { name: "Touring Kayak 12ft", sku: "WATER-001", unitPrice: 649.99, costPrice: 380.00, quantity: 4, reorderPoint: 2, unit: "each", status: "ACTIVE", categoryId: water.id, userId, description: "12-foot touring kayak with rudder" },
    }),
    prisma.product.create({
      data: { name: "Dry Bag 30L", sku: "WATER-002", unitPrice: 29.99, costPrice: 12.99, quantity: 35, reorderPoint: 12, unit: "each", status: "ACTIVE", categoryId: water.id, userId, description: "Waterproof roll-top dry bag" },
    }),
    prisma.product.create({
      data: { name: "All-Mountain Skis 176cm", sku: "WINTER-001", unitPrice: 549.99, costPrice: 320.00, quantity: 10, reorderPoint: 4, unit: "each", status: "ACTIVE", categoryId: winter.id, userId, description: "Versatile all-mountain skis" },
    }),
    prisma.product.create({
      data: { name: "Snowboard Boots Pro", sku: "WINTER-002", unitPrice: 249.99, costPrice: 140.00, quantity: 0, reorderPoint: 5, unit: "each", status: "INACTIVE", categoryId: winter.id, userId, description: "Stiff flex pro snowboard boots" },
    }),
  ]);
  console.log("Seeded 12 products.");

  // Suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: { name: "Mountain Gear Co.", contactName: "Jake Morrison", email: "jake@mountaingear.co", phone: "(503) 555-0142", address: "1200 Alpine Way", city: "Portland", state: "OR", zip: "97201", userId },
    }),
    prisma.supplier.create({
      data: { name: "Rapid River Supply", contactName: "Sarah Chen", email: "sarah@rapidriver.com", phone: "(206) 555-0198", address: "450 Waterfront Dr", city: "Seattle", state: "WA", zip: "98101", userId },
    }),
    prisma.supplier.create({
      data: { name: "Peak Performance Wholesale", contactName: "Marcus Rivera", email: "marcus@peakwholesale.com", phone: "(720) 555-0167", address: "890 Summit Blvd", city: "Denver", state: "CO", zip: "80202", userId },
    }),
    prisma.supplier.create({
      data: { name: "Nordic Trail Distributors", contactName: "Emma Lindstrom", email: "emma@nordictrail.com", phone: "(612) 555-0134", address: "2100 Frost Ave", city: "Minneapolis", state: "MN", zip: "55401", userId },
    }),
  ]);
  console.log("Seeded 4 suppliers.");

  // Stock Movements - 15 movements over the last 30 days
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  await prisma.stockMovement.createMany({
    data: [
      { type: "RECEIVED", quantity: 20, notes: "Initial stock from Mountain Gear", productId: products[0].id, userId, createdAt: daysAgo(28) },
      { type: "RECEIVED", quantity: 15, notes: "Bulk order from Peak Performance", productId: products[2].id, userId, createdAt: daysAgo(25) },
      { type: "SOLD", quantity: -5, notes: "Online order #1042", productId: products[0].id, userId, createdAt: daysAgo(22) },
      { type: "SOLD", quantity: -8, notes: "Retail sales batch", productId: products[1].id, userId, createdAt: daysAgo(20) },
      { type: "RECEIVED", quantity: 10, notes: "Restock from supplier", productId: products[4].id, userId, createdAt: daysAgo(18) },
      { type: "SOLD", quantity: -3, notes: "Customer order #1089", productId: products[6].id, userId, createdAt: daysAgo(15) },
      { type: "DAMAGED", quantity: -2, notes: "Water damage in warehouse", productId: products[9].id, userId, createdAt: daysAgo(14) },
      { type: "ADJUSTED", quantity: -1, notes: "Inventory count correction", productId: products[3].id, userId, createdAt: daysAgo(12) },
      { type: "RETURNED", quantity: 1, notes: "Customer return - wrong size", productId: products[4].id, userId, createdAt: daysAgo(10) },
      { type: "SOLD", quantity: -4, notes: "Weekend sale batch", productId: products[2].id, userId, createdAt: daysAgo(8) },
      { type: "RECEIVED", quantity: 6, notes: "Special order from Nordic Trail", productId: products[10].id, userId, createdAt: daysAgo(7) },
      { type: "SOLD", quantity: -2, notes: "Online order #1156", productId: products[8].id, userId, createdAt: daysAgo(5) },
      { type: "ADJUSTED", quantity: 3, notes: "Found misplaced stock", productId: products[9].id, userId, createdAt: daysAgo(4) },
      { type: "SOLD", quantity: -6, notes: "Bulk corporate order", productId: products[2].id, userId, createdAt: daysAgo(2) },
      { type: "RETURNED", quantity: 1, notes: "Defective item return", productId: products[7].id, userId, createdAt: daysAgo(1) },
    ],
  });
  console.log("Seeded 15 stock movements.");

  // Purchase Orders
  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: "PO-001",
      status: "DRAFT",
      supplierId: suppliers[0].id,
      orderDate: daysAgo(5),
      expectedDate: new Date(now.getTime() + 14 * 86400000),
      notes: "Restocking camping gear for spring season",
      totalAmount: 3149.85,
      userId,
    },
  });
  await prisma.purchaseOrderItem.createMany({
    data: [
      { quantity: 10, unitPrice: 180.00, productId: products[0].id, purchaseOrderId: po1.id, userId },
      { quantity: 15, unitPrice: 95.00, productId: products[1].id, purchaseOrderId: po1.id, userId },
      { quantity: 20, unitPrice: 22.00, productId: products[2].id, purchaseOrderId: po1.id, userId },
    ],
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: "PO-002",
      status: "SUBMITTED",
      supplierId: suppliers[2].id,
      orderDate: daysAgo(10),
      expectedDate: new Date(now.getTime() + 7 * 86400000),
      notes: "Climbing and cycling equipment order",
      totalAmount: 3475.00,
      userId,
    },
  });
  await prisma.purchaseOrderItem.createMany({
    data: [
      { quantity: 8, unitPrice: 120.00, productId: products[3].id, purchaseOrderId: po2.id, userId },
      { quantity: 12, unitPrice: 45.00, productId: products[4].id, purchaseOrderId: po2.id, userId },
      { quantity: 5, unitPrice: 15.00, productId: products[5].id, purchaseOrderId: po2.id, userId },
      { quantity: 3, unitPrice: 550.00, productId: products[6].id, purchaseOrderId: po2.id, userId },
    ],
  });

  const po3 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: "PO-003",
      status: "RECEIVED",
      supplierId: suppliers[1].id,
      orderDate: daysAgo(20),
      expectedDate: daysAgo(10),
      receivedDate: daysAgo(9),
      notes: "Water sports inventory refresh",
      totalAmount: 1949.85,
      userId,
    },
  });
  await prisma.purchaseOrderItem.createMany({
    data: [
      { quantity: 2, unitPrice: 380.00, receivedQuantity: 2, productId: products[8].id, purchaseOrderId: po3.id, userId },
      { quantity: 20, unitPrice: 12.99, receivedQuantity: 20, productId: products[9].id, purchaseOrderId: po3.id, userId },
      { quantity: 5, unitPrice: 180.00, receivedQuantity: 5, productId: products[0].id, purchaseOrderId: po3.id, userId },
    ],
  });

  await prisma.purchaseOrder.create({
    data: {
      orderNumber: "PO-004",
      status: "CANCELLED",
      supplierId: suppliers[3].id,
      orderDate: daysAgo(15),
      notes: "Cancelled - supplier out of stock",
      totalAmount: 1779.95,
      userId,
      items: {
        create: [
          { quantity: 4, unitPrice: 320.00, productId: products[10].id, userId },
          { quantity: 3, unitPrice: 140.00, productId: products[11].id, userId },
        ],
      },
    },
  });
  console.log("Seeded 4 purchase orders with line items.");

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
