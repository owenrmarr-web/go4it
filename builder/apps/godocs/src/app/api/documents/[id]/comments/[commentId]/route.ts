import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;

  const comment = await prisma.documentComment.findUnique({
    where: { id: commentId },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== session.user.id)
    return NextResponse.json({ error: "Cannot delete another user's comment" }, { status: 403 });

  await prisma.documentComment.delete({ where: { id: commentId } });

  return NextResponse.json({ success: true });
}
