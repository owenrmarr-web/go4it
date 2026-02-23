import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/channels/[id]/polls/[pollId]/vote — vote on a poll
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, pollId } = await params;
  const body = await request.json();
  const { optionId } = body;

  if (!optionId) {
    return NextResponse.json({ error: "Option ID required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Verify poll exists and is open
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
  });
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  if (poll.isClosed) {
    return NextResponse.json({ error: "Poll is closed" }, { status: 400 });
  }

  // Upsert vote (one per user per poll)
  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId: session.user.id } },
    update: { optionId },
    create: { pollId, optionId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
