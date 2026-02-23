import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/dm/[id]/read-status — get the other user's read receipt
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const dm = await prisma.directMessage.findUnique({ where: { id } });
  if (!dm) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (dm.user1Id !== session.user.id && dm.user2Id !== session.user.id) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const otherUserId = dm.user1Id === session.user.id ? dm.user2Id : dm.user1Id;

  const receipt = await prisma.dMReadReceipt.findUnique({
    where: {
      directMessageId_userId: { directMessageId: id, userId: otherUserId },
    },
  });

  return NextResponse.json({
    lastReadAt: receipt?.lastReadAt?.toISOString() || null,
  });
}
