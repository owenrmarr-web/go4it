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
  const template = await prisma.template.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!template)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(template);
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
  const result = await prisma.template.updateMany({
    where: { id, userId: session.user.id },
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
      category: body.category,
    },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.template.findUnique({ where: { id } });
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
  const template = await prisma.template.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { campaigns: true } } },
  });
  if (!template)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.template.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
