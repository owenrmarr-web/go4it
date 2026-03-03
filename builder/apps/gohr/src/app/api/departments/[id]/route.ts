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
  const department = await prisma.department.findFirst({
    where: { id, userId: session.user.id },
    include: {
      head: { select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true } },
      employees: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, profileColor: true, profileEmoji: true } },
        },
      },
    },
  });

  if (!department) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(department);
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
  const { name, description, headId, color } = body;

  const department = await prisma.department.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(headId !== undefined && { headId: headId || null }),
      ...(color !== undefined && { color }),
    },
  });

  if (department.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.department.findFirst({ where: { id } });
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

  const result = await prisma.department.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
