import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/services — List all services ordered by sortOrder (public for booking page)
export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(services);
}

// POST /api/services — Create a new service
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, durationMin, price, color, customFields } = body;

  if (!name || typeof durationMin !== "number" || typeof price !== "number") {
    return NextResponse.json(
      { error: "name, durationMin, and price are required" },
      { status: 400 }
    );
  }

  const service = await prisma.service.create({
    data: {
      name,
      description: description || null,
      durationMin,
      price,
      color: color || null,
      customFields: customFields ? JSON.stringify(customFields) : "[]",
      userId: session.user.id,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
