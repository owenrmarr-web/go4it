import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/channels/[id]/members — list members of a channel
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const members = await prisma.channelMember.findMany({
    where: { channelId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/channels/[id]/members — add a member by userId or email
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { email, userId, historyAccess } = body;

  if (!email && !userId) {
    return NextResponse.json({ error: "Email or userId is required" }, { status: 400 });
  }

  // Verify current user is a member
  const myMembership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  // Find the user to add
  let userToAdd;
  if (userId) {
    userToAdd = await prisma.user.findUnique({ where: { id: userId } });
  } else {
    userToAdd = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  if (!userToAdd) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: userToAdd.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "User is already a member of this channel" }, { status: 409 });
  }

  // Determine visibleFrom based on historyAccess
  let visibleFrom: Date | null = null;
  if (historyAccess === "none") {
    visibleFrom = new Date();
  } else if (historyAccess === "1day") {
    visibleFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }
  // "all" or undefined → visibleFrom stays null (see all history)

  try {
    const member = await prisma.channelMember.create({
      data: {
        channelId: id,
        userId: userToAdd.id,
        role: "member",
        ...(visibleFrom ? { visibleFrom } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error("Failed to add member:", err);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

// DELETE /api/channels/[id]/members — remove a member
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify current user is a member
  const myMembership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  // Find the membership to remove
  const targetMembership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId } },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "User is not a member of this channel" }, { status: 404 });
  }

  // Prevent removing the last admin
  if (targetMembership.role === "admin") {
    const adminCount = await prisma.channelMember.count({
      where: { channelId: id, role: "admin" },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  await prisma.channelMember.delete({
    where: { channelId_userId: { channelId: id, userId } },
  });

  return NextResponse.json({ success: true });
}
