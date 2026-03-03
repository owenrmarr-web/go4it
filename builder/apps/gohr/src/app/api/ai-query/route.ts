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
  (userId: string) => Promise<{ type: string; items: unknown[]; summary: string }>
> = {
  list_employees: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const employees = await prisma.employeeProfile.findMany({
      where: { ...where, status: "ACTIVE" },
      include: {
        user: { select: { name: true, email: true } },
        department: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    const items = employees.map((e) => ({
      name: e.user.name,
      email: e.user.email,
      jobTitle: e.jobTitle,
      department: e.department?.name || "Unassigned",
      hireDate: e.hireDate,
    }));
    return {
      type: "employees",
      items,
      summary: `${items.length} active employees`,
    };
  },

  employee_search: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const employees = await prisma.employeeProfile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        department: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    const items = employees.map((e) => ({
      name: e.user.name,
      email: e.user.email,
      jobTitle: e.jobTitle,
      department: e.department?.name || "Unassigned",
      status: e.status,
    }));
    return {
      type: "employees",
      items,
      summary: `${items.length} employees found`,
    };
  },

  pending_timeoff: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const requests = await prisma.timeOffRequest.findMany({
      where: { ...where, status: "PENDING" },
      include: {
        profile: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { startDate: "asc" },
    });
    const items = requests.map((r) => ({
      employee: r.profile.user.name,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
      totalDays: r.totalDays,
    }));
    return {
      type: "pending_timeoff",
      items,
      summary: `${items.length} pending time-off requests`,
    };
  },

  employees_on_leave: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const now = new Date();
    const requests = await prisma.timeOffRequest.findMany({
      where: {
        ...where,
        status: "APPROVED",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        profile: {
          include: { user: { select: { name: true } } },
        },
      },
    });
    const items = requests.map((r) => ({
      employee: r.profile.user.name,
      type: r.type,
      startDate: r.startDate,
      endDate: r.endDate,
    }));
    return {
      type: "employees_on_leave",
      items,
      summary: `${items.length} employees currently on leave`,
    };
  },

  department_headcount: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const departments = await prisma.department.findMany({
      where,
      include: {
        employees: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
    });
    const items = departments.map((d) => ({
      department: d.name,
      headcount: d.employees.length,
    }));
    return {
      type: "department_headcount",
      items,
      summary: departments
        .map((d) => `${d.name}: ${d.employees.length}`)
        .join(", "),
    };
  },

  recent_hires: async (userId) => {
    const where = userId === "org" ? {} : { userId };
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const employees = await prisma.employeeProfile.findMany({
      where: {
        ...where,
        hireDate: { gte: ninetyDaysAgo },
      },
      include: {
        user: { select: { name: true, email: true } },
        department: { select: { name: true } },
      },
      orderBy: { hireDate: "desc" },
    });
    const items = employees.map((e) => ({
      name: e.user.name,
      email: e.user.email,
      jobTitle: e.jobTitle,
      department: e.department?.name || "Unassigned",
      hireDate: e.hireDate,
    }));
    return {
      type: "recent_hires",
      items,
      summary: `${items.length} employees hired in the last 90 days`,
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
        const data = await handler(userId);
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
