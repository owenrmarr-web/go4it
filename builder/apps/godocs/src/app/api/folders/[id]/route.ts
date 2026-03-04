import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id, userId: session.user.id },
    include: {
      parent: { select: { id: true, name: true } },
      children: {
        include: { _count: { select: { documents: true } } },
      },
      documents: {
        include: {
          versions: { select: { versionNumber: true }, orderBy: { versionNumber: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { documents: true, children: true } },
    },
  });

  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(folder);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, description, color, parentId } = await request.json();

  const existing = await prisma.folder.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.folder.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id, userId: session.user.id },
    include: { _count: { select: { documents: true, children: true } } },
  });
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (folder._count.documents > 0 || folder._count.children > 0) {
    return NextResponse.json(
      { error: "Folder contains documents or subfolders. Move or delete them first." },
      { status: 400 }
    );
  }

  await prisma.folder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
