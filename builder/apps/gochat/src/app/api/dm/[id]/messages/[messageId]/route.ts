import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { transformMessage } from "@/lib/transformMessage";
import { chatEvents } from "@/lib/events";

// PUT /api/dm/[id]/messages/[messageId] — edit own DM message
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const message = await prisma.dMMessage.findUnique({
    where: { id: messageId },
  });

  if (!message || message.directMessageId !== id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.userId !== session.user.id) {
    return NextResponse.json({ error: "Can only edit your own messages" }, { status: 403 });
  }

  if (message.isDeleted) {
    return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
  }

  const updated = await prisma.dMMessage.update({
    where: { id: messageId },
    data: { content: content.trim(), isEdited: true },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      files: true,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = transformMessage(updated as any, session.user!.id);
  chatEvents.emit("event", {
    type: "message_edited",
    dmId: id,
    userId: session.user!.id,
    data: transformed,
  });
  return NextResponse.json({ message: transformed });
}

// DELETE /api/dm/[id]/messages/[messageId] — soft-delete own DM message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;

  const message = await prisma.dMMessage.findUnique({
    where: { id: messageId },
  });

  if (!message || message.directMessageId !== id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.userId !== session.user.id) {
    return NextResponse.json({ error: "Can only delete your own DM messages" }, { status: 403 });
  }

  const updated = await prisma.dMMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "" },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      files: true,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = transformMessage(updated as any, session.user!.id);
  chatEvents.emit("event", {
    type: "message_deleted",
    dmId: id,
    userId: session.user!.id,
    data: { messageId, message: transformed },
  });
  return NextResponse.json({ message: transformed });
}
