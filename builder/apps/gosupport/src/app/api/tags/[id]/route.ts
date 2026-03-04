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

  const tag = await prisma.tag.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { name?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.tag.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.color ? { color: body.color } : {}),
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

  const tag = await prisma.tag.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
