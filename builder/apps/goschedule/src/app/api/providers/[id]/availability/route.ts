import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/providers/[id]/availability — Return weekly availability for this provider
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const availability = await prisma.providerAvailability.findMany({
    where: { providerId: id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json(availability);
}

// PUT /api/providers/[id]/availability — Bulk replace weekly availability
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { schedule } = body;

  if (!Array.isArray(schedule)) {
    return NextResponse.json(
      { error: "schedule must be an array" },
      { status: 400 }
    );
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Validate each entry
  for (const entry of schedule) {
    if (
      typeof entry.dayOfWeek !== "number" ||
      entry.dayOfWeek < 0 ||
      entry.dayOfWeek > 6
    ) {
      return NextResponse.json(
        { error: "dayOfWeek must be 0-6" },
        { status: 400 }
      );
    }
    if (!entry.startTime || !entry.endTime) {
      return NextResponse.json(
        { error: "startTime and endTime are required for each entry" },
        { status: 400 }
      );
    }
  }

  // Delete existing and create new in a transaction
  const availability = await prisma.$transaction(async (tx) => {
    await tx.providerAvailability.deleteMany({
      where: { providerId: id },
    });

    const created = await Promise.all(
      schedule.map((entry: { dayOfWeek: number; startTime: string; endTime: string }) =>
        tx.providerAvailability.create({
          data: {
            providerId: id,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
          },
        })
      )
    );

    return created;
  });

  return NextResponse.json(availability);
}
