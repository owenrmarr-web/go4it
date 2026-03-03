import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { userId: session.user.id },
    include: {
      head: { select: { id: true, name: true, image: true, profileColor: true, profileEmoji: true } },
      employees: { where: { status: { not: "TERMINATED" } }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, headId, color } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: {
      name,
      description: description || null,
      headId: headId || null,
      color: color || "#6366f1",
      userId: session.user.id,
    },
  });

  return NextResponse.json(department, { status: 201 });
}
