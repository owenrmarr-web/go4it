import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/search?q= — search messages across channels and DMs
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const query = q.trim().toLowerCase();

  // Get channels the user is a member of
  const userChannels = await prisma.channelMember.findMany({
    where: { userId: session.user.id },
    select: { channelId: true },
  });
  const channelIds = userChannels.map((cm) => cm.channelId);

  // Search channel messages (SQLite: no mode insensitive, use lowercase)
  const channelMessages = await prisma.message.findMany({
    where: {
      channelId: { in: channelIds },
      content: { contains: query },
    },
    include: {
      user: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // Get DM conversations the user is part of
  const userDMs = await prisma.directMessage.findMany({
    where: {
      OR: [{ user1Id: session.user.id }, { user2Id: session.user.id }],
    },
    select: { id: true, user1Id: true, user2Id: true },
  });
  const dmIds = userDMs.map((dm) => dm.id);

  // Search DM messages
  const dmMessages = await prisma.dMMessage.findMany({
    where: {
      directMessageId: { in: dmIds },
      content: { contains: query },
    },
    include: {
      user: { select: { id: true, name: true } },
      directMessage: {
        include: {
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const results = [
    ...channelMessages.map((msg) => ({
      id: msg.id,
      messageId: msg.id,
      content: msg.content,
      authorName: msg.user.name || "Unknown",
      channelName: msg.channel?.name || "Unknown",
      type: "channel" as const,
      contextId: msg.channelId!,
      createdAt: msg.createdAt.toISOString(),
    })),
    ...dmMessages.map((msg) => {
      const otherUser =
        msg.directMessage.user1Id === session.user!.id
          ? msg.directMessage.user2
          : msg.directMessage.user1;
      return {
        id: msg.id,
        messageId: msg.id,
        content: msg.content,
        authorName: msg.user.name || "Unknown",
        channelName: otherUser.name || "Unknown",
        type: "dm" as const,
        contextId: msg.directMessageId,
        createdAt: msg.createdAt.toISOString(),
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ results });
}
