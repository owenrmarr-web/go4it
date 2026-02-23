import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/profile — return current user's profile fields
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      avatarUrl: true,
      avatarColor: true,
      image: true,
      profileColor: true,
      profileEmoji: true,
      title: true,
    },
  });

  return NextResponse.json(user);
}

// PUT /api/profile — update avatar color (standalone mode only)
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { avatarColor } = body;

  const updateData: Record<string, string | null> = {};
  if (avatarColor !== undefined) {
    updateData.avatarColor = avatarColor || null;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, avatarUrl: true, avatarColor: true },
  });

  return NextResponse.json(user);
}
