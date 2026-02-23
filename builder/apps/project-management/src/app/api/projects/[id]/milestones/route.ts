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

    const milestones = await prisma.milestone.findMany({
      where: { projectId: id },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = milestones.map((m) => ({
      ...m,
      taskCount: m._count.tasks,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/projects/[id]/milestones error:", error);
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
    if (!["owner", "admin", "member"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, dueDate } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        name: name.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
        userId: session.user.id,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/milestones error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
