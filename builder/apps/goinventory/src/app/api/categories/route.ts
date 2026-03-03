import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  const category = await prisma.category.create({
    data: {
      name: data.name,
      description: data.description || null,
      color: data.color || "#6366f1",
      userId: session.user.id,
    },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(category, { status: 201 });
}
