import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const tag = await prisma.tag.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      color: body.color,
    },
  });

  if (tag.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.tag.findFirst({ where: { id, userId: session.user.id } });
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
  await prisma.tag.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
