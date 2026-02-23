import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const statuses = await prisma.customStatus.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("GET /api/projects/[id]/statuses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["owner", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, position } = body;

    if (!name?.trim() || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 });
    }

    const status = await prisma.customStatus.create({
      data: {
        name: name.trim(),
        color,
        position: position ?? 0,
        projectId: id,
        userId: session.user.id,
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/statuses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
