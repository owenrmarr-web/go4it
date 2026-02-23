import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/services/[id] — Get a single service
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json(service);
}

// PUT /api/services/[id] — Update a service (partial updates)
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

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  const allowedFields = [
    "name",
    "description",
    "durationMin",
    "price",
    "currency",
    "isActive",
    "sortOrder",
    "color",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (body.customFields !== undefined) {
    updateData.customFields = JSON.stringify(body.customFields);
  }

  const service = await prisma.service.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(service);
}

// DELETE /api/services/[id] — Delete a service (only if no active appointments reference it)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Check for active appointments referencing this service
  const activeAppointments = await prisma.appointment.count({
    where: {
      serviceId: id,
      status: { in: ["confirmed", "completed"] },
    },
  });

  if (activeAppointments > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete service: ${activeAppointments} active appointment(s) reference it`,
      },
      { status: 409 }
    );
  }

  // Delete provider-service links first, then the service
  await prisma.providerService.deleteMany({ where: { serviceId: id } });
  await prisma.service.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
