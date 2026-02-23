import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { chatEvents } from "@/lib/events";

// POST /api/reactions — toggle reaction (add if not exists, remove if exists)
// Body: { messageId, emoji, type: "channel" | "dm" }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { messageId, emoji, type = "channel" } = body;

  if (!messageId || !emoji) {
    return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
  }

  if (type === "dm") {
    // DM reaction
    const existing = await prisma.dMReaction.findUnique({
      where: {
        dmMessageId_userId_emoji: {
          dmMessageId: messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.dMReaction.delete({ where: { id: existing.id } });
      const dmMsg = await prisma.dMMessage.findUnique({ where: { id: messageId }, select: { directMessageId: true } });
      chatEvents.emit("event", {
        type: "reaction",
        dmId: dmMsg?.directMessageId,
        userId: session.user.id,
        userName: session.user.name || undefined,
        data: { action: "removed", emoji, messageId },
      });
      return NextResponse.json({ action: "removed", emoji, messageId });
    } else {
      // Verify message exists and user is a participant
      const dmMessage = await prisma.dMMessage.findUnique({
        where: { id: messageId },
        include: { directMessage: true },
      });

      if (!dmMessage) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const dm = dmMessage.directMessage;
      if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
        return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
      }

      const reaction = await prisma.dMReaction.create({
        data: {
          dmMessageId: messageId,
          userId: session.user.id,
          emoji,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      chatEvents.emit("event", {
        type: "reaction",
        dmId: dm.id,
        userId: session.user.id,
        userName: reaction.user.name,
        data: { action: "added", emoji, messageId },
      });
      return NextResponse.json({ action: "added", reaction }, { status: 201 });
    }
  } else {
    // Channel reaction
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({ where: { id: existing.id } });
      const chMsg = await prisma.message.findUnique({ where: { id: messageId }, select: { channelId: true } });
      chatEvents.emit("event", {
        type: "reaction",
        channelId: chMsg?.channelId || undefined,
        userId: session.user.id,
        userName: session.user.name || undefined,
        data: { action: "removed", emoji, messageId },
      });
      return NextResponse.json({ action: "removed", emoji, messageId });
    } else {
      // Verify message exists and user is a member of the channel
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { channel: { include: { members: true } } },
      });

      if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const isMember = message.channel.members.some((m) => m.userId === session.user.id);
      if (!isMember) {
        return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
      }

      const reaction = await prisma.reaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      chatEvents.emit("event", {
        type: "reaction",
        channelId: message.channelId,
        userId: session.user.id,
        userName: reaction.user.name,
        data: { action: "added", emoji, messageId },
      });
      return NextResponse.json({ action: "added", reaction }, { status: 201 });
    }
  }
}
