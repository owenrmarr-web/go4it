import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/channels — list channels user is a member of
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      _count: { select: { members: true, messages: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    isDefault: ch.isDefault,
    memberCount: ch._count.members,
    messageCount: ch._count.messages,
    myRole: ch.members[0]?.role ?? null,
    createdAt: ch.createdAt,
  }));

  return NextResponse.json(result);
}

// POST /api/channels — create a new channel
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
  }

  const channel = await prisma.channel.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      userId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "admin",
        },
      },
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ channel }, { status: 201 });
}
