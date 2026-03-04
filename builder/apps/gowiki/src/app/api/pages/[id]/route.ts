import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.page.findFirst({
    where: { id, userId: session.user.id },
    include: {
      space: { select: { id: true, name: true, icon: true, color: true } },
      author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      lastEditedBy: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
      parent: { select: { id: true, title: true } },
      children: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, status: true, updatedAt: true },
      },
      revisions: {
        orderBy: { revisionNumber: "desc" },
        include: {
          editor: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
        },
      },
      pageTags: { include: { tag: true } },
      _count: { select: { children: true, revisions: true } },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Increment view count
  await prisma.page.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json(page);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.page.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {
    lastEditedById: session.user.id,
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.spaceId !== undefined) updateData.spaceId = body.spaceId;
  if (body.parentId !== undefined) updateData.parentId = body.parentId || null;
  if (body.pinned !== undefined) updateData.pinned = body.pinned;
  if (body.order !== undefined) updateData.order = body.order;

  const page = await prisma.page.update({
    where: { id },
    data: updateData,
  });

  // Create revision if content changed
  if (body.content !== undefined && body.content !== existing.content) {
    const lastRevision = await prisma.pageRevision.findFirst({
      where: { pageId: id },
      orderBy: { revisionNumber: "desc" },
    });
    await prisma.pageRevision.create({
      data: {
        content: body.content,
        changeNotes: body.changeNotes || null,
        editorId: session.user.id,
        revisionNumber: (lastRevision?.revisionNumber || 0) + 1,
        pageId: id,
        userId: session.user.id,
      },
    });
  }

  // Handle tags if provided
  if (body.tagIds !== undefined) {
    await prisma.pageTag.deleteMany({ where: { pageId: id } });
    if (body.tagIds.length > 0) {
      await prisma.pageTag.createMany({
        data: body.tagIds.map((tagId: string) => ({
          pageId: id,
          tagId,
          userId: session.user.id,
        })),
      });
    }
  }

  return NextResponse.json(page);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const page = await prisma.page.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (page.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Cannot delete a published page. Archive it first." },
      { status: 400 }
    );
  }

  // Unparent children
  await prisma.page.updateMany({
    where: { parentId: id, userId: session.user.id },
    data: { parentId: null },
  });

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
