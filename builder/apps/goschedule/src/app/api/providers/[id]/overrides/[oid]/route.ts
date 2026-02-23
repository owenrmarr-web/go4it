import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PUT /api/providers/[id]/overrides/[oid] — Update an override
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; oid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, oid } = await params;
  const body = await request.json();

  const existing = await prisma.providerAvailabilityOverride.findUnique({
    where: { id: oid },
  });

  if (!existing || existing.providerId !== id) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.date !== undefined) updateData.date = body.date;
  if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;
  if (body.reason !== undefined) updateData.reason = body.reason;

  const override = await prisma.providerAvailabilityOverride.update({
    where: { id: oid },
    data: updateData,
  });

  return NextResponse.json(override);
}

// DELETE /api/providers/[id]/overrides/[oid] — Delete an override
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; oid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, oid } = await params;

  const existing = await prisma.providerAvailabilityOverride.findUnique({
    where: { id: oid },
  });

  if (!existing || existing.providerId !== id) {
    return NextResponse.json({ error: "Override not found" }, { status: 404 });
  }

  await prisma.providerAvailabilityOverride.delete({
    where: { id: oid },
  });

  return NextResponse.json({ success: true });
}
