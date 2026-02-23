import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/dm — list DM conversations for the current user, with last message preview
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const conversations = await prisma.directMessage.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      readReceipts: {
        where: { userId },
        select: { lastReadAt: true, lastMessageId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = conversations.map((dm) => {
    const otherUser = dm.user1Id === userId ? dm.user2 : dm.user1;
    const lastMessage = dm.messages[0] || null;
    const readReceipt = dm.readReceipts[0] || null;

    return {
      id: dm.id,
      otherUser,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            userId: lastMessage.userId,
            userName: lastMessage.user.name,
            createdAt: lastMessage.createdAt,
          }
        : null,
      lastReadMessageId: readReceipt?.lastMessageId || null,
      updatedAt: dm.updatedAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/dm — start a new DM conversation (or return existing one)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId: targetUserId } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot start a DM with yourself" }, { status: 400 });
  }

  // Verify the target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Sort user IDs to maintain consistent ordering (user1Id < user2Id)
  const [user1Id, user2Id] = [session.user.id, targetUserId].sort();

  // Check for existing conversation
  let dm = await prisma.directMessage.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
    },
  });

  if (dm) {
    return NextResponse.json({ dm });
  }

  // Create new conversation
  dm = await prisma.directMessage.create({
    data: { user1Id, user2Id },
    include: {
      user1: { select: { id: true, name: true, email: true } },
      user2: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ dm }, { status: 201 });
}
