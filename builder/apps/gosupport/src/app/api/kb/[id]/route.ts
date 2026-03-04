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

  const article = await prisma.kBArticle.findFirst({
    where: { id, userId: session.user.id },
    include: { category: true },
  });

  if (!article)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(article);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const article = await prisma.kBArticle.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!article)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.status !== undefined) updateData.status = body.status;

  const updated = await prisma.kBArticle.update({
    where: { id },
    data: updateData,
    include: { category: true },
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

  const article = await prisma.kBArticle.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!article)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.kBArticle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
