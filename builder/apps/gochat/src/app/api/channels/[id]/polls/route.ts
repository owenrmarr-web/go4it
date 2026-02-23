import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { transformMessage } from "@/lib/transformMessage";

// POST /api/channels/[id]/polls — create a poll
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { question, options } = body;

  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Question required" }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    return NextResponse.json({ error: "2-4 options required" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Create message + poll in transaction
  const message = await prisma.message.create({
    data: {
      content: `Poll: ${question.trim()}`,
      channelId: id,
      userId: session.user.id,
      poll: {
        create: {
          question: question.trim(),
          channelId: id,
          creatorId: session.user.id,
          options: {
            create: options.map((text: string) => ({ text: text.trim() })),
          },
        },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, avatarColor: true, image: true, profileColor: true, profileEmoji: true, title: true } },
      reactions: { include: { user: { select: { id: true, name: true } } } },
      files: true,
      pinnedBy: { select: { id: true, userId: true, createdAt: true } },
      _count: { select: { replies: true } },
      poll: {
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json({ message: transformMessage(message as any, session.user!.id) }, { status: 201 });
}
