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
  const { content } = await request.json();

  if (!content?.trim())
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });

  const document = await prisma.document.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.documentComment.create({
    data: {
      content,
      authorId: session.user.id,
      documentId: id,
      userId: session.user.id,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
