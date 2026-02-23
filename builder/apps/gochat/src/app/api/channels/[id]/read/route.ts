import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/channels/[id]/read — mark channel as read
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

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  }

  const receipt = await prisma.channelReadReceipt.upsert({
    where: {
      channelId_userId: { channelId: id, userId: session.user.id },
    },
    update: {
      lastMessageId: lastMessageId || null,
      lastReadAt: new Date(),
    },
    create: {
      channelId: id,
      userId: session.user.id,
      lastMessageId: lastMessageId || null,
      lastReadAt: new Date(),
    },
  });

  return NextResponse.json(receipt);
}
