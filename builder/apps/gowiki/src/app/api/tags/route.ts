import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (search) {
    where.name = { contains: search };
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { pageTags: true } },
    },
  });

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const tag = await prisma.tag.create({
    data: {
      name: body.name,
      color: body.color || "#6366f1",
      userId: session.user.id,
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
