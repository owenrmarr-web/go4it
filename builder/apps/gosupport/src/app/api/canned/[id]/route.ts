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

  const cr = await prisma.cannedResponse.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { title?: string; content?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.cannedResponse.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title.trim() } : {}),
      ...(body.content ? { content: body.content } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
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

  const cr = await prisma.cannedResponse.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cannedResponse.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
