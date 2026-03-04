import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.kBCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { articles: true } },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name: string; description?: string; order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = await prisma.kBCategory.create({
    data: {
      userId: session.user.id,
      name: body.name.trim(),
      description: body.description || null,
      order: body.order ?? 0,
    },
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json(category, { status: 201 });
}
