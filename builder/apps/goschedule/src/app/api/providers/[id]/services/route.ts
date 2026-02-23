import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/providers/[id]/services — List service IDs assigned to this provider
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

  const providerServices = await prisma.providerService.findMany({
    where: { providerId: id },
    select: { serviceId: true },
  });

  const serviceIds = providerServices.map((ps) => ps.serviceId);

  return NextResponse.json({ serviceIds });
}

// PUT /api/providers/[id]/services — Bulk replace service assignments
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
  const { serviceIds } = body;

  if (!Array.isArray(serviceIds)) {
    return NextResponse.json(
      { error: "serviceIds must be an array" },
      { status: 400 }
    );
  }

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Verify all service IDs exist
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true },
  });

  const validIds = new Set(services.map((s) => s.id));
  const invalidIds = serviceIds.filter((sid: string) => !validIds.has(sid));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Invalid service IDs: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // Delete existing and create new in a transaction
  const result = await prisma.$transaction(async (tx) => {
    await tx.providerService.deleteMany({
      where: { providerId: id },
    });

    const created = await Promise.all(
      serviceIds.map((serviceId: string) =>
        tx.providerService.create({
          data: {
            providerId: id,
            serviceId,
          },
        })
      )
    );

    return created;
  });

  return NextResponse.json({
    serviceIds: result.map((ps) => ps.serviceId),
  });
}
