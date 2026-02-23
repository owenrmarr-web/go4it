import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/providers — List all providers with staff user, services, and availability (public for booking page)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  const providers = await prisma.provider.findMany({
    where: showAll ? {} : { isActive: true },
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
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(providers);
}

// POST /api/providers — Create a new provider
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { staffUserId, phone, bio } = body;

  if (!staffUserId) {
    return NextResponse.json(
      { error: "staffUserId is required" },
      { status: 400 }
    );
  }

  // Verify the staff user exists
  const staffUser = await prisma.user.findUnique({
    where: { id: staffUserId },
  });

  if (!staffUser) {
    return NextResponse.json(
      { error: "Staff user not found" },
      { status: 404 }
    );
  }

  // Check if already a provider
  const existingProvider = await prisma.provider.findUnique({
    where: { staffUserId },
  });

  if (existingProvider) {
    return NextResponse.json(
      { error: "This user is already a provider" },
      { status: 409 }
    );
  }

  const provider = await prisma.provider.create({
    data: {
      staffUserId,
      phone: phone || null,
      bio: bio || null,
      userId: session.user.id,
    },
    include: {
      staffUser: {
        select: { name: true, email: true, isAssigned: true },
      },
    },
  });

  return NextResponse.json(provider, { status: 201 });
}
