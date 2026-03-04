import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { content: string; isInternal?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const comment = await prisma.ticketComment.create({
    data: {
      userId: session.user.id,
      ticketId: id,
      content: body.content,
      isInternal: body.isInternal ?? false,
      authorId: session.user.id,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          profileColor: true,
          profileEmoji: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }

  const comment = await prisma.ticketComment.findFirst({
    where: { id: commentId, ticketId: id, userId: session.user.id },
  });
  if (!comment)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ticketComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
