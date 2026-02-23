import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { transformMessage } from "@/lib/transformMessage";

// GET /api/channels/[id]/messages/[messageId]/thread — get thread replies
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Get the parent message
  const parent = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      files: true,
      pinnedBy: { select: { id: true, userId: true, createdAt: true } },
    },
  });

  if (!parent || parent.channelId !== id) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Get replies
  const where: Record<string, unknown> = { parentId: messageId };
  if (after) {
    const cursorMsg = await prisma.message.findUnique({
      where: { id: after },
      select: { createdAt: true },
    });
    if (cursorMsg) {
      where.createdAt = { gt: cursorMsg.createdAt };
    }
  }

  const replies = await prisma.message.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      files: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentMsg = transformMessage(parent as any, session.user!.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replyMsgs = replies.map((r: any) => transformMessage(r, session.user!.id));

  return NextResponse.json({ parent: parentMsg, replies: replyMsgs });
}
