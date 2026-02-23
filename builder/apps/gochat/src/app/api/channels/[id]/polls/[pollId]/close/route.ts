import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// POST /api/channels/[id]/polls/[pollId]/close — close a poll (creator only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pollId } = await params;

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
  });

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (poll.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Only the poll creator can close it" }, { status: 403 });
  }

  await prisma.poll.update({
    where: { id: pollId },
    data: { isClosed: true },
  });

  return NextResponse.json({ success: true });
}
