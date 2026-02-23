import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/providers/[id] — Full provider detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      staffUser: {
        select: { name: true, email: true, isAssigned: true },
      },
      services: {
        include: { service: true },
      },
      availability: {
        orderBy: { dayOfWeek: "asc" },
      },
      overrides: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json(provider);
}

// PUT /api/providers/[id] — Update provider (phone, bio, isActive)
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

  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.bio !== undefined) updateData.bio = body.bio;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const provider = await prisma.provider.update({
    where: { id },
    data: updateData,
    include: {
      staffUser: {
        select: { name: true, email: true, isAssigned: true },
      },
    },
  });

  return NextResponse.json(provider);
}

// DELETE /api/providers/[id] — Soft-delete by setting isActive=false
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  // Soft-delete: set isActive=false (appointments reference providers, so don't hard delete)
  const provider = await prisma.provider.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(provider);
}
