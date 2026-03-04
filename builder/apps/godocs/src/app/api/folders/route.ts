import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    include: {
      children: {
        include: {
          _count: { select: { documents: true } },
        },
      },
      _count: { select: { documents: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, color, parentId } = await request.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const folder = await prisma.folder.create({
    data: {
      name,
      description,
      color: color ?? "#6366f1",
      parentId: parentId || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
