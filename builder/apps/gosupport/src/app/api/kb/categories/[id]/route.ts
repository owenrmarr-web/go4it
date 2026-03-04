import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const cat = await prisma.kBCategory.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { name?: string; description?: string; order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.kBCategory.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
    },
    include: { _count: { select: { articles: true } } },
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

  const cat = await prisma.kBCategory.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unlink articles before deleting
  await prisma.kBArticle.updateMany({
    where: { categoryId: id, userId: session.user.id },
    data: { categoryId: null },
  });

  await prisma.kBCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
