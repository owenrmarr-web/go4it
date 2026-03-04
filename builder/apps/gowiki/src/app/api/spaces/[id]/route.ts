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
  const space = await prisma.space.findFirst({
    where: { id, userId: session.user.id },
    include: {
      pages: {
        orderBy: [{ pinned: "desc" }, { order: "asc" }, { title: "asc" }],
        include: {
          author: { select: { id: true, name: true, profileEmoji: true, profileColor: true, image: true } },
          pageTags: { include: { tag: true } },
          _count: { select: { children: true, revisions: true } },
        },
      },
      _count: { select: { pages: true } },
    },
  });

  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(space);
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

  const space = await prisma.space.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      order: body.order,
    },
  });

  if (space.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.space.findFirst({ where: { id, userId: session.user.id } });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const pageCount = await prisma.page.count({
    where: { spaceId: id, userId: session.user.id },
  });

  if (pageCount > 0) {
    return NextResponse.json(
      { error: "Space has pages. Move or delete them first." },
      { status: 400 }
    );
  }

  await prisma.space.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
