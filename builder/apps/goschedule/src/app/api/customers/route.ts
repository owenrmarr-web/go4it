import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/customers — List customers ordered by name, with optional search
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let customers;

  if (search) {
    const searchLower = search.toLowerCase();

    // SQLite doesn't support ILIKE, so we fetch all and filter in JS
    const allCustomers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    });

    customers = allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower)
    );
  } else {
    customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json(customers);
}
