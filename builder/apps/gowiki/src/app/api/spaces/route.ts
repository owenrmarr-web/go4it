import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "order";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (search) {
    where.name = { contains: search };
  }

  const orderBy: Record<string, string> =
    sort === "name" ? { name: "asc" } : sort === "pageCount" ? { name: "asc" } : { order: "asc" };

  const spaces = await prisma.space.findMany({
    where,
    orderBy,
    include: {
      _count: { select: { pages: true } },
    },
  });

  return NextResponse.json(spaces);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const space = await prisma.space.create({
    data: {
      name: body.name,
      description: body.description || null,
      icon: body.icon || "📁",
      color: body.color || "#6366f1",
      order: body.order || 0,
      userId: session.user.id,
    },
  });

  return NextResponse.json(space, { status: 201 });
}
