import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { chatEvents } from "@/lib/events";

// POST /api/dm/[id]/read — mark DM as read
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let lastMessageId: string | null = null;
  try {
    const body = await request.json();
    lastMessageId = body.lastMessageId || null;
  } catch {
    // Empty body is fine — just mark as read with current time
  }

  // Verify user is part of this DM
  const dm = await prisma.directMessage.findUnique({
    where: { id },
  });

  if (!dm) {
    return NextResponse.json({ error: "DM conversation not found" }, { status: 404 });
  }

  if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
  }

  const receipt = await prisma.dMReadReceipt.upsert({
    where: {
      directMessageId_userId: { directMessageId: id, userId: session.user.id },
    },
    update: {
      lastMessageId: lastMessageId || null,
      lastReadAt: new Date(),
    },
    create: {
      directMessageId: id,
      userId: session.user.id,
      lastMessageId: lastMessageId || null,
      lastReadAt: new Date(),
    },
  });

  chatEvents.emit("event", {
    type: "dm_read",
    dmId: id,
    userId: session.user.id,
    data: { dmId: id, userId: session.user.id, lastReadAt: receipt.lastReadAt.toISOString() },
  });

  return NextResponse.json(receipt);
}
