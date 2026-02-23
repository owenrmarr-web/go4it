import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/channels/[id]/pin — list pinned messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const raw = await prisma.pinnedMessage.findMany({
    where: { channelId: id },
    include: {
      message: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pinned = raw.map((p) => ({
    id: p.id,
    messageId: p.messageId,
    content: p.message.content,
    authorName: p.message.user.name || p.message.user.email || "Unknown",
    pinnedAt: p.createdAt.toISOString(),
    pinnedByName: p.user.name || "Unknown",
  }));

  return NextResponse.json({ pinned });
}

// POST /api/channels/[id]/pin — pin a message
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
  const { messageId } = body;

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  // Verify message belongs to this channel
  const message = await prisma.message.findFirst({
    where: { id: messageId, channelId: id },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found in this channel" }, { status: 404 });
  }

  // Check if already pinned
  const existing = await prisma.pinnedMessage.findUnique({
    where: { messageId },
  });

  if (existing) {
    return NextResponse.json({ error: "Message is already pinned" }, { status: 409 });
  }

  const pinned = await prisma.pinnedMessage.create({
    data: {
      messageId,
      channelId: id,
      userId: session.user.id,
    },
    include: {
      message: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(pinned, { status: 201 });
}

// DELETE /api/channels/[id]/pin — unpin a message
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
  const { messageId } = body;

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const pinned = await prisma.pinnedMessage.findUnique({
    where: { messageId },
  });

  if (!pinned || pinned.channelId !== id) {
    return NextResponse.json({ error: "Pinned message not found in this channel" }, { status: 404 });
  }

  await prisma.pinnedMessage.delete({
    where: { messageId },
  });

  return NextResponse.json({ success: true });
}
