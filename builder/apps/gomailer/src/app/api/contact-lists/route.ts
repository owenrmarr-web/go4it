import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await prisma.contactList.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { subscribers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const list = await prisma.contactList.create({
    data: {
      name: body.name,
      description: body.description || null,
      color: body.color || "#6366f1",
      userId: session.user.id,
    },
  });
  return NextResponse.json(list, { status: 201 });
}
