import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ============================================================
// AI Query Endpoint — Cross-App Data Access for GO4IT
// ============================================================
// This endpoint lets other GO4IT apps query this app's data.
// The auth scaffolding below handles both user sessions and
// org-level app-to-app calls. DO NOT modify the authenticate
// function — add your query handlers to the `handlers` object.
// ============================================================

// Query handlers — add one for each data model in your app.
// Naming convention: verb_model (e.g., list_contacts, overdue_invoices)
// Each handler receives the authenticated userId (or "org" for app-to-app)
// and must return { type, items, summary }.
const handlers: Record<
  string,
  (userId: string, query?: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_products: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      type: "products",
      items: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name,
        quantity: p.quantity,
        status: p.status,
        unitPrice: p.unitPrice,
      })),
      summary: `${products.length} products found`,
    };
  },

  low_stock: async (userId) => {
    const where = userId === "org" ? { status: "ACTIVE" } : { userId, status: "ACTIVE" };
    const products = await prisma.product.findMany({ where });
    const lowStock = products.filter((p) => p.quantity <= p.reorderPoint);
    return {
      type: "low_stock",
      items: lowStock.map((p) => ({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        reorderPoint: p.reorderPoint,
      })),
      summary: `${lowStock.length} products are at or below reorder point`,
    };
  },

  list_suppliers: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
    return {
      type: "suppliers",
      items: suppliers.map((s) => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
      })),
      summary: `${suppliers.length} suppliers`,
    };
  },

  recent_orders: async (userId) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const where: Record<string, unknown> = { orderDate: { gte: thirtyDaysAgo } };
    if (userId !== "org") where.userId = userId;
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true },
      orderBy: { orderDate: "desc" },
    });
    return {
      type: "recent_orders",
      items: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        supplier: o.supplier.name,
        total: o.totalAmount,
        orderDate: o.orderDate,
      })),
      summary: `${orders.length} orders in the last 30 days`,
    };
  },

  stock_value: async (userId) => {
    const where = userId === "org" ? { status: "ACTIVE" } : { userId, status: "ACTIVE" };
    const products = await prisma.product.findMany({ where });
    const totalValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    return {
      type: "stock_value",
      items: [{ totalValue, productCount: products.length }],
      summary: `Total inventory value: $${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })} across ${products.length} active products`,
    };
  },

  product_search: async (userId, query) => {
    const searchTerm = query?.replace(/product.search/i, "").trim() || "";
    const where: Record<string, unknown> = {};
    if (userId !== "org") where.userId = userId;
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ];
    }
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      take: 10,
    });
    return {
      type: "product_search",
      items: products.map((p) => ({
        name: p.name,
        sku: p.sku,
        category: p.category?.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        status: p.status,
      })),
      summary: `Found ${products.length} product(s) matching "${searchTerm}"`,
    };
  },
};

const capabilities = Object.keys(handlers);

// Authenticate via user session OR org secret (for app-to-app calls).
// DO NOT modify this function.
async function authenticate(request: Request): Promise<string | null> {
  // Check org secret first (app-to-app calls on Fly.io internal network)
  const secret = request.headers.get("x-go4it-secret");
  const orgSecret = process.env.GO4IT_ORG_SECRET;
  if (secret && orgSecret && secret === orgSecret) {
    return "org";
  }

  // Fall back to user session
  const session = await auth();
  return session?.user?.id || null;
}

// GET /api/ai-query — returns this app's query capabilities
export async function GET() {
  return NextResponse.json({ capabilities });
}

// POST /api/ai-query — execute a query
export async function POST(request: Request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body;
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "Request body must include a 'query' string" },
      { status: 400 }
    );
  }

  // Match query to a handler by keyword
  const q = query.toLowerCase();
  for (const [name, handler] of Object.entries(handlers)) {
    const keywords = name.replace(/_/g, " ");
    if (q.includes(keywords) || q.includes(name)) {
      try {
        const data = await handler(userId, query);
        return NextResponse.json({
          query,
          status: "success",
          capabilities,
          data,
        });
      } catch (error) {
        console.error(`AI query handler '${name}' error:`, error);
        return NextResponse.json(
          { query, status: "error", error: `Handler '${name}' failed` },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    query,
    status: "no_match",
    capabilities,
    message:
      capabilities.length > 0
        ? `No handler matched. Available: ${capabilities.join(", ")}`
        : "No query handlers configured yet.",
  });
}
