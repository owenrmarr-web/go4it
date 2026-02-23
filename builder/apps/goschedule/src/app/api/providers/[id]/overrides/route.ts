import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/providers/[id]/overrides — List overrides (optionally filter by date range)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const where: Record<string, unknown> = { providerId: id };

  if (from || to) {
    const dateFilter: Record<string, string> = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    where.date = dateFilter;
  }

  const overrides = await prisma.providerAvailabilityOverride.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json(overrides);
}

// POST /api/providers/[id]/overrides — Create a new override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { date, isAvailable, startTime, endTime, reason } = body;

  if (!date) {
    return NextResponse.json(
      { error: "date is required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Check for existing override on this date
  const existing = await prisma.providerAvailabilityOverride.findUnique({
    where: { providerId_date: { providerId: id, date } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An override already exists for this date" },
      { status: 409 }
    );
  }

  const override = await prisma.providerAvailabilityOverride.create({
    data: {
      providerId: id,
      date,
      isAvailable: isAvailable ?? false,
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason || null,
    },
  });

  return NextResponse.json(override, { status: 201 });
}
