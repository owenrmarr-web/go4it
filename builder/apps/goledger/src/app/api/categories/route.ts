import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (type) {
    where.type = type;
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || !body.type) {
    return NextResponse.json(
      { error: "name and type are required" },
      { status: 400 }
    );
  }

  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
      color: body.color || "#9333ea",
      userId: session.user.id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
